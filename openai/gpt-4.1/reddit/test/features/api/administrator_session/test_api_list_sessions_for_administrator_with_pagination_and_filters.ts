import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdministratorSession";

/**
 * Test retrieval and filtering of administrator sessions with pagination and
 * filters.
 *
 * 1. Register two separate administrators (adminA, adminB).
 * 2. As adminA, call PATCH
 *    /communityPlatform/administrator/administrators/{administratorId}/sessions
 *    using adminA's id—expect success.
 *
 *    - Query with no filters.
 *    - Query with pagination: page=1, limit=2.
 *    - Query filtering by created_at_from, created_at_to using a valid range from
 *         existing result.
 *    - Query filtering by IP (using the session's recorded IP).
 *    - Query filtering by expired=true/false if sessions have expired_at set/unset.
 *    - On each, validate response type and scoping: all sessions belong to the
 *         correct admin.
 * 3. As adminB, attempt to read adminA's sessions using adminA's id—expect access
 *    denied or empty result (compliance enforcement).
 * 4. As anonymous (unauthenticated), attempt to call session listing—expect access
 *    denied (must not list sessions for unauthenticated users).
 */
export async function test_api_list_sessions_for_administrator_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Register two administrators, adminA and adminB
  const adminA = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminA);
  const adminB = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminB);

  // 2. As adminA, get session list with no filters
  const sessionsAll: IPageICommunityPlatformAdministratorSession.ISummary =
    await api.functional.communityPlatform.administrator.administrators.sessions.index(
      connection,
      {
        administratorId: adminA.id,
        body: {},
      },
    );
  typia.assert(sessionsAll);
  // All sessions should be for adminA
  TestValidator.predicate(
    "all sessions match adminA",
    sessionsAll.data.every((s) => s.administrator.id === adminA.id),
  );

  // Get at least 1 session for further filter testing
  const firstSession = sessionsAll.data[0];

  // 2a. Pagination test: limit 1
  const pageResult =
    await api.functional.communityPlatform.administrator.administrators.sessions.index(
      connection,
      {
        administratorId: adminA.id,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 1 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "pagination returns at most 1 result",
    pageResult.data.length <= 1,
  );

  // 2b. Date range filter test, if at least 1 session
  if (firstSession) {
    const createdAt: string & tags.Format<"date-time"> =
      firstSession.created_at;
    // Query only sessions with created_at >= firstSession's created_at and <= same
    const filteredByDate =
      await api.functional.communityPlatform.administrator.administrators.sessions.index(
        connection,
        {
          administratorId: adminA.id,
          body: { created_at_from: createdAt, created_at_to: createdAt },
        },
      );
    typia.assert(filteredByDate);
    TestValidator.predicate(
      "all filtered sessions by date match createdAt",
      filteredByDate.data.every((s) => s.created_at === createdAt),
    );

    // 2c. IP filter test
    if (firstSession.ip) {
      const filteredByIp =
        await api.functional.communityPlatform.administrator.administrators.sessions.index(
          connection,
          {
            administratorId: adminA.id,
            body: { ip: firstSession.ip },
          },
        );
      typia.assert(filteredByIp);
      TestValidator.predicate(
        "all filtered sessions by IP match",
        filteredByIp.data.every((s) => s.ip === firstSession.ip),
      );
    }
    // 2d. Expired status filter (check both true/false)
    // Find expired and active status, if present
    const expiredSession = sessionsAll.data.find(
      (s) => s.expired_at !== null && s.expired_at !== undefined,
    );
    const activeSession = sessionsAll.data.find(
      (s) => s.expired_at === null || s.expired_at === undefined,
    );
    if (expiredSession) {
      const expiredResult =
        await api.functional.communityPlatform.administrator.administrators.sessions.index(
          connection,
          {
            administratorId: adminA.id,
            body: { expired: true },
          },
        );
      typia.assert(expiredResult);
      TestValidator.predicate(
        "filtered sessions all expired",
        expiredResult.data.every(
          (s) => s.expired_at !== null && s.expired_at !== undefined,
        ),
      );
    }
    if (activeSession) {
      const activeResult =
        await api.functional.communityPlatform.administrator.administrators.sessions.index(
          connection,
          {
            administratorId: adminA.id,
            body: { expired: false },
          },
        );
      typia.assert(activeResult);
      TestValidator.predicate(
        "filtered sessions all active",
        activeResult.data.every(
          (s) => s.expired_at === null || s.expired_at === undefined,
        ),
      );
    }
  }

  // 3. Switch to adminB, attempt to fetch adminA's session list - expect access denied or empty result
  await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminB.email,
      password: adminB.token ? "" : RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  // Now as adminB (their token set), try reading adminA's sessions
  await TestValidator.error(
    "adminB cannot list adminA's sessions (permission enforcement)",
    async () => {
      await api.functional.communityPlatform.administrator.administrators.sessions.index(
        connection,
        {
          administratorId: adminA.id,
          body: {},
        },
      );
    },
  );

  // 4. As anonymous (unauthenticated), expect denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot read admin session list",
    async () => {
      await api.functional.communityPlatform.administrator.administrators.sessions.index(
        unauthConn,
        {
          administratorId: adminA.id,
          body: {},
        },
      );
    },
  );
}
