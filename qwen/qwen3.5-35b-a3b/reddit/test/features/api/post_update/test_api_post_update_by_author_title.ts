import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_update_by_author_title(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create a text post with initial title
  const postConnection: api.IConnection = { host: connection.host };
  const initialTitle = "Original Title";
  const post = await api.functional.redditPlatform.member.posts.create(
    postConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: initialTitle,
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const originalCreatedAt = post.created_at;
  const originalUpdatedAt = post.updated_at;
  const originalTextContent = post.textContent?.text_content;
  // 3. Update the post title by author
  const updatedTitle = "Updated Title";
  const updatedPost = await api.functional.redditPlatform.member.posts.update(
    postConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
      } satisfies IRedditPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 4. Validate the update
  TestValidator.equals("post title updated", updatedPost.title, updatedTitle);
  TestValidator.notEquals(
    "title changed from original",
    updatedPost.title,
    initialTitle,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedPost.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "text_content unchanged",
    updatedPost.textContent?.text_content,
    originalTextContent,
  );
  TestValidator.equals(
    "upvotes_count unchanged",
    updatedPost.upvotes_count,
    post.upvotes_count,
  );
  TestValidator.equals(
    "downvotes_count unchanged",
    updatedPost.downvotes_count,
    post.downvotes_count,
  );
  TestValidator.equals(
    "comment_count unchanged",
    updatedPost.comment_count,
    post.comment_count,
  );
  TestValidator.equals(
    "author id unchanged",
    updatedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "author username unchanged",
    updatedPost.author.username,
    post.author.username,
  );
  TestValidator.equals(
    "community id unchanged",
    updatedPost.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedPost.community.name,
    post.community.name,
  );
}