import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test the retrieval of a specific moderation action by its unique identifier.
 *
 * NOTE: This test scenario has a critical limitation - there is no API endpoint
 * available to CREATE moderation actions in the provided API specification. The
 * available APIs only include the retrieval endpoint (GET
 * /redditCommunity/moderator/moderationActions/{actionId}).
 *
 * In a real-world scenario, moderation actions would be created either:
 *
 * 1. As a side effect of other moderation operations (e.g., banning a user,
 *    removing content)
 * 2. Through a dedicated POST endpoint to create moderation action records
 * 3. Automatically by the system when moderators perform moderation tasks
 *
 * This test demonstrates the retrieval functionality with the understanding
 * that it would fail in practice without a pre-existing moderation action in
 * the database. In a complete test suite, this would require either:
 *
 * - A setup script that seeds the database with moderation actions
 * - Additional API endpoints for creating moderation actions
 * - Integration with other moderation APIs that create actions as side effects
 *
 * Workflow (as much as possible with available APIs):
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community (moderator becomes the creator/moderator)
 * 3. Create and authenticate a member account
 * 4. Member creates a post in the community
 * 5. Switch back to moderator context
 * 6. Attempt to retrieve a moderation action by ID (will likely fail without prior
 *    setup)
 * 7. If successful, validate the retrieved moderation action record
 */
export async function test_api_moderation_action_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community (moderator is authenticated from join)
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: postBody,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 6: Attempt to retrieve a moderation action
  // NOTE: This will likely fail because we have no way to create a moderation action
  // with the available APIs. In a real implementation, this would require either:
  // - A database seeded with test moderation actions
  // - An API endpoint to create moderation actions
  // - Moderation actions created as side effects of other operations
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  const retrievedAction =
    await api.functional.redditCommunity.moderator.moderationActions.at(
      connection,
      {
        actionId: moderationActionId,
      },
    );

  // Step 7: Validate the retrieved moderation action
  // typia.assert() performs COMPLETE validation of all types, formats, and structure
  typia.assert(retrievedAction);

  // Business logic validation: verify the ID matches what we requested
  TestValidator.equals(
    "retrieved action ID matches requested ID",
    retrievedAction.id,
    moderationActionId,
  );
}
