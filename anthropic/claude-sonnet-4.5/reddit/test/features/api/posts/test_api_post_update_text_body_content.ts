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
 * Test updating the body content of a text post.
 *
 * This test validates the complete workflow of creating and updating a text
 * post's body content in a Reddit-style community platform. It ensures that
 * text posts can be successfully modified, the edited flag is set correctly,
 * and type constraints are maintained.
 *
 * Test Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community as moderator
 * 3. Create member account and authenticate as member
 * 4. Create a text post with initial body content
 * 5. Update the post's body content with new text
 * 6. Validate all field changes and constraints
 */
export async function test_api_post_update_text_body_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<21>
            >(),
          ),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 4: Create initial text post
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialBody = RandomGenerator.content({ paragraphs: 3 });

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

  // Validate initial post state
  TestValidator.equals(
    "initial post type is text",
    createdPost.post_type,
    "text",
  );
  TestValidator.equals("initial body matches", createdPost.body, initialBody);
  TestValidator.equals(
    "initial edited flag is false",
    createdPost.edited,
    false,
  );
  TestValidator.equals(
    "initial updated_at is null",
    createdPost.updated_at,
    null,
  );
  TestValidator.equals("url is null for text post", createdPost.url, null);
  TestValidator.equals(
    "image_url is null for text post",
    createdPost.image_url,
    null,
  );

  // Step 5: Update post body content
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBody = RandomGenerator.content({ paragraphs: 4 });

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

  // Step 6: Validate updated post state
  TestValidator.equals("post ID unchanged", updatedPost.id, createdPost.id);
  TestValidator.equals(
    "community ID unchanged",
    updatedPost.community_id,
    community.id,
  );
  TestValidator.equals("member ID unchanged", updatedPost.member_id, member.id);
  TestValidator.equals(
    "updated title matches",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals("updated body matches", updatedPost.body, updatedBody);
  TestValidator.equals("post type remains text", updatedPost.post_type, "text");
  TestValidator.equals("edited flag is true", updatedPost.edited, true);
  TestValidator.predicate(
    "updated_at is set",
    updatedPost.updated_at !== null && updatedPost.updated_at !== undefined,
  );
  TestValidator.equals("url remains null", updatedPost.url, null);
  TestValidator.equals("image_url remains null", updatedPost.image_url, null);
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    createdPost.created_at,
  );
}
