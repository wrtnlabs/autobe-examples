import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create a post in a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_community_id: communityId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Retrieve the comment by postId and commentId
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // 5. Validate response
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "author id matches",
    retrievedComment.author.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedComment.author.username,
    memberAuthorized.username,
  );
  TestValidator.equals("post id matches", retrievedComment.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "votes count matches",
    retrievedComment.votes_count,
    comment.votes_count,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.equals("deleted_at is null", retrievedComment.deleted_at, null);
}
