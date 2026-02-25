import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_posts_comments_create } from "../../../generate/generate_random_reddit_community_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityMember.IJoin,
    });
  // 2. Create a live post in a community
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers; // Use the authorized member connection
  const post: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(postConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);
  // 3. Create a new top-level comment on the live post
  const commentConnection: api.IConnection = { host: connection.host };
  commentConnection.headers = memberConnection.headers; // Use the authorized member connection
  const comment: IRedditCommunityCommentFull =
    await generate_random_reddit_community_posts_comments_create(
      commentConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Validate comment properties
  TestValidator.equals(
    "comment content matches",
    comment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author id matches",
    comment.author.id,
    member.id,
  );
  TestValidator.equals("comment vote score is zero", comment.voteScore, 0);
  TestValidator.equals("comment parent id is null", comment.parentId, null);
  TestValidator.predicate(
    "comment has timestamp",
    comment.createdAt !== undefined,
  );
  TestValidator.predicate(
    "comment has updated timestamp",
    comment.updatedAt !== undefined,
  );
  // 5. Verify post comment count increased
  const updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(postConnection, {
      body: {
        title: post.title,
        community_id: post.community.id,
        content: "",
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(updatedPost);
  TestValidator.equals(
    "post comment count increased by 1",
    updatedPost.comment_count,
    post.comment_count + 1,
  );
  // 6. Verify karma increased for user
  const updatedMember: IRedditCommunityMember.IAuthorized =
    await api.functional.redditCommunity.auth.member.join(memberConnection, {
      body: {
        email: member.email!,
        password: member.token.access,
        username: member.username,
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(updatedMember);
  TestValidator.equals(
    "member karma increased by 1",
    updatedMember.karma_score,
    member.karma_score + 1,
  );
}