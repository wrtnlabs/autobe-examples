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

export async function test_api_platform_admin_member_user_sessions_listing_with_ip_search(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Choose a member user id to query sessions for (synthetic UUID)
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Define partial IP substring for ip_contains filter
  const ipSubstring = "203.0.113.";

  // 4. Call sessions index with ip_contains filter
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    ip_contains: ipSubstring,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const pageResult: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.index(
      connection,
      {
        memberUserId,
        body: requestBody,
      },
    );

  // 5. Assert response structure and basic pagination invariants
  typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(pageResult);

  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length must not exceed pagination.limit",
    pageResult.data.length <= pagination.limit,
  );

  // 6. If any sessions are returned, verify ip filter behavior
  if (pageResult.data.length > 0) {
    for (const session of pageResult.data) {
      typia.assert<ICommunityPlatformMemberuserSession.ISummary>(session);

      TestValidator.predicate(
        "session ip should contain the requested substring when ip_contains is used",
        session.ip.includes(ipSubstring),
      );

      // Verify memberUser summary structure indirectly via typia.assert above
      TestValidator.predicate(
        "session must have a memberUser with a non-empty id",
        typeof session.memberUser.id === "string" &&
          session.memberUser.id.length > 0,
      );
    }
  }

  // 7. Authorization negative path: unauthenticated connection should fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated platform admin session listing should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.index(
        unauthConnection,
        {
          memberUserId,
          body: requestBody,
        },
      );
    },
  );
}
