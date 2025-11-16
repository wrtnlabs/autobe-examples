import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that a community moderator can perform multiple simultaneous updates to
 * community settings in a single request. Validates atomic updates of title,
 * description, category, access type, and configuration settings.
 */
export async function test_api_community_moderator_multiple_updates_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication context
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community moderator account with elevated privileges
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ModeratorPass456!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 3: Authenticate as member to create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member.email,
      password: "StrongPassword123!",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Step 4: Create a test community with initial settings
  const communityName = `test_community_${RandomGenerator.alphaNumeric(8)}`;
  const originalCategoryName = "Technology";
  const originalCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: communityName,
        title: "Original Test Community",
        description: "Original test community description",
        category_name: originalCategoryName,
        type: "public",
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(originalCommunity);

  // Step 5: Switch to moderator authentication to perform updates
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderator.email,
      password: "ModeratorPass456!",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 6: Perform multiple simultaneous updates to community settings
  const updatedCategoryName = "Science";
  const updatedCommunity =
    await api.functional.redditCommunity.communityModerator.communities.update(
      connection,
      {
        communityName: communityName,
        body: {
          title: "Updated Test Community Title",
          description:
            "Completely updated community description with new focus and guidelines",
          category_name: updatedCategoryName,
          type: "restricted",
          post_requirement_min_age: 30,
          post_requirement_min_karma: 100,
          allow_crosspost: false,
        } satisfies IRedditCommunityCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);

  // Step 7: Validate all atomic updates were applied correctly
  TestValidator.equals(
    "community ID remains unchanged",
    updatedCommunity.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "community name remains unchanged",
    updatedCommunity.name,
    originalCommunity.name,
  );
  TestValidator.equals(
    "title updated successfully",
    updatedCommunity.title,
    "Updated Test Community Title",
  );
  TestValidator.equals(
    "description updated successfully",
    updatedCommunity.description,
    "Completely updated community description with new focus and guidelines",
  );
  TestValidator.equals(
    "category updated successfully",
    updatedCommunity.category.name,
    updatedCategoryName,
  );
  TestValidator.equals(
    "type changed from public to restricted",
    updatedCommunity.type,
    "restricted",
  );
  TestValidator.equals(
    "min age requirement set to 30 days",
    updatedCommunity.post_requirement_min_age,
    30,
  );
  TestValidator.equals(
    "min karma requirement set to 100",
    updatedCommunity.post_requirement_min_karma,
    100,
  );
  TestValidator.equals(
    "crosspost permission disabled",
    updatedCommunity.allow_crosspost,
    false,
  );
  TestValidator.notEquals(
    "updated timestamp should change",
    updatedCommunity.updated_at,
    originalCommunity.updated_at,
  );
  TestValidator.equals(
    "subscriber count should remain unchanged",
    updatedCommunity.subscriber_count,
    originalCommunity.subscriber_count,
  );
  TestValidator.equals(
    "created timestamp should remain unchanged",
    updatedCommunity.created_at,
    originalCommunity.created_at,
  );
}
