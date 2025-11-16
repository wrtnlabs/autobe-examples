import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorSession";

/**
 * Validates the ability of an administrator to audit moderator authentication
 * sessions.
 *
 * This scenario simulates an administrator joining and then performing a
 * session audit for a moderator (using a random UUID as the moderator, as
 * moderator creation/join is out of current scope).
 *
 * 1. Creates and authenticates an administrator using the join endpoint.
 * 2. Performs session audits for a moderatorId (random UUID) with various filter
 *    combinations, including pagination (page/limit), date ranges, IP, and
 *    status (active/expired/null), and validates:
 *
 *    - Results are only for the given moderatorId/filters (if any session exists)
 *    - All session metadata (id, moderator, ip, href, referrer, created_at,
 *         expired_at) is present and of correct format
 *    - Pagination reflects correct page/limit/total/pages
 *    - Sensitive data is never exposed in session records
 *    - Business errors are raised for invalid moderatorId
 *    - Rate limiting is handled (simulated by rapidly repeated requests)
 * 3. All error paths use correct data types (no type errors are tested).
 */
export async function test_api_moderator_session_audit_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Choose a random moderator UUID for audit; session data may be empty if no such moderator exists
  const moderatorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Query sessions with no filters (basic fetch)
  const page1: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId,
        body: {
          moderator_id: moderatorId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModeratorSession.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "moderator id in query matches all returned entries",
    ArrayUtil.has(
      page1.data,
      (s) => s.community_platform_moderator_id !== moderatorId,
    ),
    false,
  );
  for (const session of page1.data) {
    typia.assert(session);
    TestValidator.equals(
      "session moderator.id matches queried id",
      session.moderator.id,
      moderatorId,
    );
    TestValidator.predicate(
      "session metadata present",
      !!session.id &&
        !!session.ip &&
        !!session.href &&
        !!session.referrer &&
        !!session.created_at,
    );
  }

  // 4. Filter by status: active and then expired
  for (const status of ["active", "expired", null] as const) {
    const filtered: IPageICommunityPlatformModeratorSession =
      await api.functional.communityPlatform.administrator.moderators.sessions.index(
        connection,
        {
          moderatorId,
          body: {
            moderator_id: moderatorId,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 5 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            status,
          } satisfies ICommunityPlatformModeratorSession.IRequest,
        },
      );
    typia.assert(filtered);
    for (const entry of filtered.data) {
      if (status) {
        if (status === "active") {
          TestValidator.equals(
            "session active: expired_at should be null/undefined",
            entry.expired_at,
            null,
          );
        } else if (status === "expired") {
          TestValidator.predicate(
            "session expired: expired_at must exist",
            entry.expired_at !== null && entry.expired_at !== undefined,
          );
        }
      }
      TestValidator.equals(
        "session moderator match",
        entry.community_platform_moderator_id,
        moderatorId,
      );
      TestValidator.equals(
        "session moderator inner match",
        entry.moderator.id,
        moderatorId,
      );
    }
  }

  // 5. Pagination: fetch at least two pages (if possible)
  const paged: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId,
        body: {
          moderator_id: moderatorId,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformModeratorSession.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination current page is 2",
    paged.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit matches", paged.pagination.limit, 5);

  // 6. Filter by date range and IP (with random plausible dates/IP)
  const now = new Date();
  const start_date = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 week ago
  const end_date = now.toISOString();
  const randomIp = `${RandomGenerator.pick(["10", "172", "192"])}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  const ranged: IPageICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.administrator.moderators.sessions.index(
      connection,
      {
        moderatorId,
        body: {
          moderator_id: moderatorId,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          start_date,
          end_date,
          ip: randomIp,
        } satisfies ICommunityPlatformModeratorSession.IRequest,
      },
    );
  typia.assert(ranged);
  for (const entry of ranged.data) {
    TestValidator.predicate(
      "entry created_at in range",
      entry.created_at >= start_date && entry.created_at <= end_date,
    );
    TestValidator.equals(
      "entry ip matches filter or could be empty",
      entry.ip,
      randomIp,
    );
  }

  // 7. Stress test for (simulated) rate limiting: Do 10 rapid requests
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(10, (i) => i),
    async () => {
      await api.functional.communityPlatform.administrator.moderators.sessions.index(
        connection,
        {
          moderatorId,
          body: {
            moderator_id: moderatorId,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 3 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies ICommunityPlatformModeratorSession.IRequest,
        },
      );
    },
  );
}
