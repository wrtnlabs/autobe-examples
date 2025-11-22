import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_community_duplicate_join_attempt(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphaNumeric(12),
    email: userEmail,
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(user);

  // Step 2: User joins a community for the first time
  const communityName = "test-community-" + RandomGenerator.alphaNumeric(8);

  const firstMembership: IRedditPlatformCommunityMembership =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });
  typia.assert(firstMembership);

  // Validate first membership
  TestValidator.equals(
    "user ID matches in first membership",
    firstMembership.registered_user_id,
    user.id,
  );
  TestValidator.equals(
    "membership level is subscriber",
    firstMembership.membership_level,
    "subscriber",
  );

  // Step 3: Attempt to join the same community again (duplicate attempt)
  await TestValidator.error(
    "should handle duplicate join attempt gracefully",
    async () => {
      await api.functional.redditPlatform.communities.join(connection, {
        communityName: communityName,
      });
    },
  );

  // Step 4: Verify no duplicate membership was created
  const duplicateMembershipCheck =
    await api.functional.redditPlatform.communities.join(connection, {
      communityName: communityName,
    });

  TestValidator.equals(
    "duplicate membership ID should match original",
    duplicateMembershipCheck.id,
    firstMembership.id,
  );
  TestValidator.equals(
    "same user should remain member",
    duplicateMembershipCheck.registered_user_id,
    firstMembership.registered_user_id,
  );
}
