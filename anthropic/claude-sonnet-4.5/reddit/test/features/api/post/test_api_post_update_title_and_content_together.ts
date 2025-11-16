import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test updating both title and content together in a single operation.
 *
 * This test validates that a member can update both the title and body content
 * of a text post simultaneously in a single API request. It verifies that both
 * fields are modified correctly, the edited flag is set to true, the updated_at
 * timestamp is changed, and all other fields remain unchanged.
 *
 * Test flow:
 *
 * 1. Create moderator and community
 * 2. Create member as post author
 * 3. Member creates a text post with initial title and body
 * 4. Member updates both title and body in one request
 * 5. Verify both fields changed, edited flag is true, updated_at modified
 * 6. Verify other fields (community_id, member_id, post_type, etc.) unchanged
 */
export async function test_api_post_update_title_and_content_together(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community for posts
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 4 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account as post author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a text post with initial title and body
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialBody = RandomGenerator.content({ paragraphs: 2 });

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: initialTitle,
        post_type: "text",
        body: initialBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Verify initial post state
  TestValidator.equals(
    "initial title matches",
    createdPost.title,
    initialTitle,
  );
  TestValidator.equals("initial body matches", createdPost.body, initialBody);
  TestValidator.equals(
    "edited flag initially false",
    createdPost.edited,
    false,
  );
  TestValidator.equals(
    "initial updated_at is null",
    createdPost.updated_at,
    null,
  );

  // Step 5: Update both title and body together in a single request
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
        url: null,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // Step 6: Verify both title and body were successfully updated
  TestValidator.equals(
    "title updated successfully",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "body updated successfully",
    updatedPost.body,
    updatedBody,
  );

  // Step 7: Verify edited flag is now true
  TestValidator.equals("edited flag set to true", updatedPost.edited, true);

  // Step 8: Verify updated_at timestamp was modified
  TestValidator.predicate(
    "updated_at is now set",
    updatedPost.updated_at !== null && updatedPost.updated_at !== undefined,
  );

  // Step 9: Verify all other fields remain unchanged
  TestValidator.equals("post ID unchanged", updatedPost.id, createdPost.id);
  TestValidator.equals(
    "community_id unchanged",
    updatedPost.community_id,
    community.id,
  );
  TestValidator.equals("member_id unchanged", updatedPost.member_id, member.id);
  TestValidator.equals("post_type unchanged", updatedPost.post_type, "text");
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    createdPost.created_at,
  );
  TestValidator.equals("url remains null", updatedPost.url, null);
  TestValidator.equals("image_url remains null", updatedPost.image_url, null);
  TestValidator.equals("deleted_at remains null", updatedPost.deleted_at, null);
}
