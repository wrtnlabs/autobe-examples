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
 * Test partial update capability where only some fields are modified.
 *
 * This test validates that post updates work correctly when only specific
 * fields are provided, ensuring that omitted fields remain unchanged. The
 * scenario creates a text post and then updates only the title, verifying that
 * the body content is preserved, the edited flag is set, and the updated_at
 * timestamp is modified.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create member account for post authorship
 * 3. Create text post with initial title and body
 * 4. Update only the title field
 * 5. Validate selective update and edit tracking
 */
export async function test_api_post_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator and community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(connection.headers?.Authorization);

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: memberPassword,
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
  typia.assert(connection.headers?.Authorization);

  // Step 3: Create initial text post
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
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

  // Verify initial state
  TestValidator.equals(
    "initial title matches",
    createdPost.title,
    initialTitle,
  );
  TestValidator.equals("initial body matches", createdPost.body, initialBody);
  TestValidator.equals("initially not edited", createdPost.edited, false);

  // Step 4: Update only the title field
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: updatedTitle,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // Step 5: Validate partial update results
  TestValidator.equals("title was updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "body remained unchanged",
    updatedPost.body,
    initialBody,
  );
  TestValidator.equals("post type unchanged", updatedPost.post_type, "text");
  TestValidator.equals(
    "community unchanged",
    updatedPost.community_id,
    community.id,
  );
  TestValidator.equals("edited flag set to true", updatedPost.edited, true);
  TestValidator.predicate(
    "updated_at is set after update",
    updatedPost.updated_at !== null && updatedPost.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at differs from created_at",
    updatedPost.updated_at !== createdPost.created_at,
  );
}
