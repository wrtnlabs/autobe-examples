import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

/**
 * Basic listing and pagination of member user sessions for platform admin.
 *
 * 1. Register a new platform administrator using the auth.platformAdmin.join
 *    endpoint; this also establishes an authenticated admin session and wires
 *    JWT tokens into the connection headers.
 * 2. Choose a member user ID (UUID string) assumed to exist in seeded test data.
 * 3. Call PATCH
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/sessions via
 *    api.functional.communityPlatform.platformAdmin.memberUsers.sessions.index
 *    with a basic ICommunityPlatformMemberuserSession.IRequest payload that
 *    sets page=1 and limit=5 and leaves all filters empty.
 * 4. Assert that the response conforms to
 *    IPageICommunityPlatformMemberuserSession.ISummary and that pagination
 *    metadata is consistent with the request and returned data size.
 * 5. Verify that each returned session summary is scoped to the specified
 *    memberUserId through its embedded memberUser summary.
 */
export async function test_api_platform_admin_member_user_sessions_listing_basic(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Choose a target member user ID (assumed to exist in seeded data).
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a basic request for sessions listing (page=1, limit=5).
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const pageResult: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.index(
      connection,
      {
        memberUserId,
        body: requestBody,
      },
    );

  // 4. Structural validation of the response.
  typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const sessions: ICommunityPlatformMemberuserSession.ISummary[] =
    pageResult.data;

  // 5. Pagination metadata vs. data size consistency.
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data length must not exceed pagination.limit",
    sessions.length <= pagination.limit,
  );

  // 6. Verify that each session belongs to the requested member user ID.
  for (const session of sessions) {
    const memberSummary: ICommunityPlatformMemberuser.ISummary =
      session.memberUser;
    TestValidator.equals(
      "session.memberUser.id must match requested memberUserId",
      memberSummary.id,
      memberUserId,
    );
  }
}
