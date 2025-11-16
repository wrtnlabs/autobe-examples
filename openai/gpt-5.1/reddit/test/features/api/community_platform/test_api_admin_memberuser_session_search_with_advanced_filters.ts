import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

export async function test_api_admin_memberuser_session_search_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. AdminUser joins to obtain an authorized context.
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Initial relaxed search to obtain a baseline page of sessions for some
  // random username. Since we cannot create member sessions here, we accept
  // that the result may be empty and only do deeper checks when we get data.
  const targetUsername: string = RandomGenerator.name(1);

  const initialRequestBody = {
    // No time window, ip, href, referrer, or status to keep this broad.
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const initialPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: targetUsername,
        body: initialRequestBody,
      },
    );
  typia.assert(initialPage);

  // Basic pagination sanity check
  TestValidator.equals(
    "initial pagination current page must match request",
    initialPage.pagination.current,
    initialRequestBody.page,
  );
  TestValidator.equals(
    "initial pagination limit must match request",
    initialPage.pagination.limit,
    initialRequestBody.limit,
  );

  const baselineSessions: ICommunityPlatformMemberuserSession.ISummary[] =
    initialPage.data;

  // If there's no data, we cannot validate filter subset behavior.
  if (baselineSessions.length === 0) {
    // Still ensure no session points to a different username (should never
    // happen, but we guard logically for future changes).
    TestValidator.equals(
      "initial data must be empty when no sessions found",
      baselineSessions.length,
      0,
    );
    return;
  }

  // 3. Build a strict filter from a baseline session.
  const baseline: ICommunityPlatformMemberuserSession.ISummary =
    baselineSessions[0];

  // All sessions must belong to the requested username.
  for (const s of baselineSessions) {
    TestValidator.equals(
      "baseline sessions must belong to username in path",
      s.memberUser.username,
      targetUsername,
    );
  }

  const strictRequestBody = {
    from: baseline.created_at,
    to: baseline.created_at,
    ip: baseline.ip,
    href: baseline.href,
    referrer: baseline.referrer,
    status: "active",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const strictPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: targetUsername,
        body: strictRequestBody,
      },
    );
  typia.assert(strictPage);

  TestValidator.equals(
    "strict pagination current must match request",
    strictPage.pagination.current,
    strictRequestBody.page,
  );
  TestValidator.equals(
    "strict pagination limit must match request",
    strictPage.pagination.limit,
    strictRequestBody.limit,
  );

  // All returned sessions must belong to the requested username and match
  // the concrete filter fields we supplied (ip, href, referrer).
  for (const session of strictPage.data) {
    TestValidator.equals(
      "strict page session member username must match path",
      session.memberUser.username,
      targetUsername,
    );
    TestValidator.equals(
      "strict page session ip must match filter",
      session.ip,
      strictRequestBody.ip,
    );
    TestValidator.equals(
      "strict page session href must match filter",
      session.href,
      strictRequestBody.href,
    );
    TestValidator.equals(
      "strict page session referrer must match filter",
      session.referrer,
      strictRequestBody.referrer,
    );
  }

  // Verify ordering by created_at desc when there are at least two records.
  if (strictPage.data.length >= 2) {
    for (let i = 1; i < strictPage.data.length; i++) {
      const prev = strictPage.data[i - 1];
      const curr = strictPage.data[i];
      TestValidator.predicate(
        "sessions must be ordered by created_at descending",
        prev.created_at >= curr.created_at,
      );
    }
  }

  // 4. Relax filters: only pagination and sorting, no from/to/ip/href/referrer/status.
  const relaxedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const relaxedPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: targetUsername,
        body: relaxedRequestBody,
      },
    );
  typia.assert(relaxedPage);

  TestValidator.equals(
    "relaxed pagination current must match request",
    relaxedPage.pagination.current,
    relaxedRequestBody.page,
  );
  TestValidator.equals(
    "relaxed pagination limit must match request",
    relaxedPage.pagination.limit,
    relaxedRequestBody.limit,
  );

  for (const session of relaxedPage.data) {
    TestValidator.equals(
      "relaxed page session member username must match path",
      session.memberUser.username,
      targetUsername,
    );
  }

  // If both strict and relaxed queries returned data, every strictly filtered
  // session should also appear (by id) in the relaxed dataset.
  if (strictPage.data.length > 0 && relaxedPage.data.length > 0) {
    const relaxedIds = new Set(relaxedPage.data.map((s) => s.id));
    for (const filtered of strictPage.data) {
      TestValidator.predicate(
        "every strictly filtered session must exist in relaxed result set",
        relaxedIds.has(filtered.id),
      );
    }
  }
}
