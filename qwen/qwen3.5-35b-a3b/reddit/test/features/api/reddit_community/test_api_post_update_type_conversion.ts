import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_update_type_conversion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Generate a post ID for the update operation
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Set initial state as a text post (simulating post creation/update)
  const initialPost = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: postId,
      body: {
        title: "Original Text Post",
        post_type: "text",
        text_content: "This is the original text content",
        link_url: undefined,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(initialPost);
  // Verify initial post state
  TestValidator.equals(
    "initial post type is text",
    initialPost.post_type,
    "text",
  );
  TestValidator.equals(
    "initial text content exists",
    initialPost.text_content,
    "This is the original text content",
  );
  TestValidator.notEquals("link url is null", initialPost.link_url, null);
  const originalCreatedAt = initialPost.created_at;
  const originalUpdatedAt = initialPost.updated_at;
  const originalVoteScore = initialPost.vote_score;
  const originalCommentCount = initialPost.comment_count;
  const originalId = initialPost.id;
  const originalAuthor = initialPost.author;
  const originalCommunity = initialPost.community;
  const originalDeletedAt = initialPost.deleted_at;
  // Convert to link post
  const linkUrl = "https://example.com/article";
  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: postId,
      body: {
        title: "Converted Link Post",
        post_type: "link",
        link_url: linkUrl,
        text_content: undefined,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Validate post_type changed
  TestValidator.equals(
    "post type changed to link",
    updatedPost.post_type,
    "link",
  );
  // Validate title was updated
  TestValidator.equals(
    "title updated",
    updatedPost.title,
    "Converted Link Post",
  );
  // Validate link_url is set
  TestValidator.equals("link_url is set", updatedPost.link_url, linkUrl);
  // Validate text_content is null for link post
  TestValidator.equals("text_content is null", updatedPost.text_content, null);
  // Validate updated_at was modified
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedPost.updated_at,
  );
  // Validate immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedPost.id, originalId);
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    originalAuthor.id,
  );
  TestValidator.equals(
    "author username unchanged",
    updatedPost.author.username,
    originalAuthor.username,
  );
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "community name unchanged",
    updatedPost.community.name,
    originalCommunity.name,
  );
  TestValidator.equals(
    "vote_score unchanged",
    updatedPost.vote_score,
    originalVoteScore,
  );
  TestValidator.equals(
    "comment_count unchanged",
    updatedPost.comment_count,
    originalCommentCount,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedPost.deleted_at,
    originalDeletedAt,
  );
}