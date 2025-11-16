import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserProfile";

/**
 * Test that an administrator can search and filter user profiles using PATCH
 * /communityPlatform/administrator/users/{userId}/profiles, validating filter
 * criteria, permissions, and public profile summary fields.
 *
 * 1. Register (join) as an administrator and authenticate.
 * 2. Perform advanced search queries as administrator with filters such as
 *    "status", "username", "created_after", "created_before", "updated_after",
 *    "updated_before", "page", "limit".
 * 3. Confirm only authorized administrators succeed and that unauthenticated
 *    requests are denied.
 * 4. For each search result, validate that returned fields follow the profile
 *    summary contract (public data only).
 * 5. If audit fields are present in the summaries, check they are included and
 *    plausibly valid (not empty or nonsensical).
 * 6. Validate correct pagination fields in the response.
 */
export async function test_api_user_profile_search_and_filter_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register as administrator and authenticate
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Perform profile search as admin with filters
  const now = new Date();
  const created_before = new Date(now.getTime() + 100000).toISOString();
  const searchInput = {
    status: RandomGenerator.pick(["active", "hidden", "suspended"] as const),
    username: RandomGenerator.name(1),
    created_after: new Date(now.getTime() - 1000000).toISOString(),
    created_before,
    updated_after: new Date(now.getTime() - 2000000).toISOString(),
    updated_before: created_before,
    page: 0,
    limit: 10,
    sort: "created_at DESC",
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const page: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.administrator.users.profiles.index(
      connection,
      {
        userId: typia.random<string & tags.Format<"uuid">>(),
        body: searchInput,
      },
    );
  typia.assert(page);

  // Validate response structure
  TestValidator.equals("pagination exists", typeof page.pagination, "object");
  TestValidator.predicate(
    "pagination current is number",
    typeof page.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof page.pagination.limit === "number",
  );
  TestValidator.predicate("data is array", Array.isArray(page.data));
  // Validate each summary field
  page.data.forEach((profile) => {
    typia.assert(profile);
    TestValidator.predicate(
      "profile id is uuid",
      typeof profile.id === "string" && /[0-9a-f\-]{36}/i.test(profile.id),
    );
    TestValidator.predicate(
      "community_platform_user_id is uuid",
      typeof profile.community_platform_user_id === "string" &&
        /[0-9a-f\-]{36}/i.test(profile.community_platform_user_id),
    );
    TestValidator.predicate(
      "display_username is string",
      typeof profile.display_username === "string",
    );
    TestValidator.predicate(
      "status is string",
      typeof profile.status === "string",
    );
    if (profile.avatar_uri !== null && profile.avatar_uri !== undefined) {
      TestValidator.predicate(
        "avatar_uri is string",
        typeof profile.avatar_uri === "string",
      );
    }
  });

  // 3. Test unauthorized access (simulate without token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search profiles",
    async () => {
      await api.functional.communityPlatform.administrator.users.profiles.index(
        unauthConn,
        {
          userId: typia.random<string & tags.Format<"uuid">>(),
          body: searchInput,
        },
      );
    },
  );
}
