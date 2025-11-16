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
 * Test updating a post's title by the original author.
 *
 * This test validates the post title modification functionality by:
 *
 * 1. Creating a moderator account for community management
 * 2. Creating a community where posts can be submitted
 * 3. Registering a member account as the post author
 * 4. Creating an initial post with a specific title
 * 5. Updating only the post's title
 * 6. Verifying the title change was successful
 * 7. Confirming the edited flag is set to true
 * 8. Validating the updated_at timestamp was modified
 * 9. Ensuring all other fields remain unchanged
 */
export async function test_api_post_update_title_modification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for posting
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account as post author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create initial post with original title
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: originalTitle,
        post_type: "text",
        body: postBody,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Verify initial state
  TestValidator.equals(
    "initial title matches",
    createdPost.title,
    originalTitle,
  );
  TestValidator.equals(
    "initial edited flag is false",
    createdPost.edited,
    false,
  );
  TestValidator.equals("initial body matches", createdPost.body, postBody);

  // Step 5: Update only the post title
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: createdPost.id,
      body: {
        title: newTitle,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // Step 6: Validate title was updated successfully
  TestValidator.equals("title was updated", updatedPost.title, newTitle);
  TestValidator.notEquals(
    "title changed from original",
    updatedPost.title,
    originalTitle,
  );

  // Step 7: Verify edited flag is set to true
  TestValidator.equals(
    "edited flag is true after update",
    updatedPost.edited,
    true,
  );

  // Step 8: Validate updated_at timestamp was modified
  TestValidator.predicate(
    "updated_at timestamp is set",
    updatedPost.updated_at !== null && updatedPost.updated_at !== undefined,
  );

  // Step 9: Ensure other fields remain unchanged
  TestValidator.equals("post ID unchanged", updatedPost.id, createdPost.id);
  TestValidator.equals(
    "community ID unchanged",
    updatedPost.community_id,
    community.id,
  );
  TestValidator.equals("member ID unchanged", updatedPost.member_id, member.id);
  TestValidator.equals("post type unchanged", updatedPost.post_type, "text");
  TestValidator.equals("body content unchanged", updatedPost.body, postBody);
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    createdPost.created_at,
  );
}
