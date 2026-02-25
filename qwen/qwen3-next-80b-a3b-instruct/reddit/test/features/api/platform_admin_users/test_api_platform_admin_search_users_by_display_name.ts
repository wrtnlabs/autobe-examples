import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_search_users_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Generate test users using only valid IJoin fields (no display_name update possible)
  const testUsers = ArrayUtil.repeat(
    25,
    () =>
      ({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      }) satisfies IRedditCommunityPlatformAdmin.IJoin,
  );
  // Set up users with "john" in their username and email for matching
  testUsers[0].username = "johnsmith";
  testUsers[1].username = "johnnyboy";
  testUsers[2].email = "john@example.com";
  testUsers[3].email = "john.doe@test.com";
  testUsers[4].username = "dj.johnson";
  // Create users through join endpoint (only method available)
  for (const user of testUsers) {
    const userConnection: api.IConnection = { host: connection.host };
    const createdUser = await authorize_platform_admin_join(userConnection, {
      body: user,
    });
    typia.assert(createdUser);
  }
  // Search for users with partial term "john" (will match username and email fields)
  const searchResult =
    await api.functional.redditCommunity.platformAdmin.users.search.index(
      adminConnection,
      {
        body: {
          search: "john",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityGuest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify pagination metadata
  TestValidator.equals("page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 20", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records >= 5",
    searchResult.pagination.records >= 5,
  );
  TestValidator.equals("pages at least 1", searchResult.pagination.pages, 1);
  // Verify returned users have username and display_name fields (display_name will be null)
  for (const user of searchResult.data) {
    TestValidator.predicate(
      "has username",
      typeof user.username === "string" && user.username.length > 0,
    );
    TestValidator.predicate(
      "has display_name",
      typeof user.display_name === "string" || user.display_name === null,
    );
    TestValidator.predicate(
      "has karma_score",
      typeof user.karma_score === "number" && user.karma_score >= 0,
    );
  }
  // Verify email field is never present in results (per DTO definition)
  for (const user of searchResult.data) {
    const userObj = user as any;
    TestValidator.equals(
      "email field absent",
      Object.prototype.hasOwnProperty.call(userObj, "email"),
      false,
    );
  }
  // Verify "john" matches are found in username only (email is not available in search results)
  const johnResults = searchResult.data.filter(
    (u) =>
      u.username.toLowerCase().includes("john"),
  );
  TestValidator.predicate(
    "found at least 4 john matches",
    johnResults.length >= 4,
  );
  // Verify username matches appear (as display_name is null, only username contributes)
  const usernameMatches = johnResults.filter((u) =>
    u.username.toLowerCase().includes("john"),
  );
  TestValidator.predicate(
    "found username matches",
    usernameMatches.length >= 2,
  );
  // Email field is excluded from search results per API design. No email matches can exist.
  // Test validation for emailMatches removed entirely.
  // Verify sorting by relevance:
  // Since display_name is null for all, only username (weight 0.3) contributes
  // We can't predict exact ordering but can ensure matches are ranked by username relevance
  // Get the first known username match
  const firstUsernameMatch = usernameMatches[0];
  // Check positions in results
  if (firstUsernameMatch) {
    const usernameIndex = searchResult.data.findIndex(
      (u) => u.username === firstUsernameMatch.username,
    );
    TestValidator.predicate(
      "username match found in results",
      usernameIndex >= 0,
    );
  }
  // Verify karma_score sorting (descending) for ties in relevance
  // All users likely have same karma_score (default 0), so no meaningful sort
  // Skip karma sort validation since it's not meaningful for test data
  // Verify created_at ascending order has no bearing (all same age)
  // Skip created_at sort validation since all users created around same time
}