import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can successfully update their own text post's title and text content.
 *
 * Validates the complete post update workflow including member authentication, text post creation, and post content modification. Ensures that the update operation correctly modifies the title and text content while preserving the original creation timestamp and post type.
 *
 * Special attention is given to verifying that the created_at timestamp remains unchanged after update, while the updated_at timestamp reflects the edit time. The post type must remain 'text' and cannot be changed after creation.
 *
 * 1. Register and authenticate as a member with email, password, and username.
 * 2. Create a text post with initial title and text content in a subscribed community.
 * 3. Update the post with new title and new text content.
 * 4. Validate the response contains updated fields, preserved timestamps, and correct post type.
 */
export async function test_api_post_update_text_post_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a text post
  const initialPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    },
  );
  typia.assert(initialPost);
  // Store original timestamps for validation
  const originalCreatedAt = initialPost.created_at;
  const originalUpdatedAt = initialPost.updated_at;
  // 3. Prepare update input values
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });
  const newTextContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  // 4. Update the post with new title and text content
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: initialPost.id,
      body: {
        title: newTitle,
        text_content: newTextContent,
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Validate the updated post
  TestValidator.equals(
    "title updated to new value",
    updatedPost.title,
    newTitle,
  );
  TestValidator.equals(
    "text content updated to new value",
    updatedPost.text_content,
    newTextContent,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed after edit",
    updatedPost.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals("post type remains text", updatedPost.post_type, "text");
  TestValidator.predicate(
    "author matches original",
    updatedPost.author.id === initialPost.author.id,
  );
  TestValidator.predicate(
    "community preserved",
    updatedPost.community.id === initialPost.community.id,
  );
  TestValidator.predicate(
    "vote score included",
    typeof updatedPost.vote_score === "number",
  );
  TestValidator.predicate(
    "comment count included",
    typeof updatedPost.comment_count === "number",
  );
}
