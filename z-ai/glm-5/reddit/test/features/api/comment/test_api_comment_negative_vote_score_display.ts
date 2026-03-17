import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_vote_create } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test retrieval of a comment with negative vote score.
 *
 * This test validates that:
 * 1. A comment's vote score can become negative when it receives downvotes
 * 2. The negative vote score is properly displayed in the comment response
 * 3. The comment content and author info remain properly displayed despite negative score
 * 4. The author's karma is correctly decreased when their comment is downvoted
 */
export async function test_api_comment_negative_vote_score_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  // 2. Author creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  // 3. Author creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  // 4. Author creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  // 5. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 6. Voter downvotes the comment to create negative vote score
  const vote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      voterConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          vote_type: "downvote",
        },
      },
    );
  typia.assert(vote);
  // 7. Retrieve the comment with negative vote score
  const retrievedComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // 8. Verify vote score is negative
  TestValidator.predicate(
    "vote score should be negative",
    retrievedComment.voteScore < 0,
  );
  TestValidator.equals(
    "vote score should be -1 (one downvote)",
    retrievedComment.voteScore,
    -1,
  );
  // 9. Verify comment content is still properly displayed
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  // 10. Verify author info is still properly displayed
  TestValidator.equals(
    "comment author id matches",
    retrievedComment.author.id,
    authorAuth.id,
  );
  TestValidator.equals(
    "comment author username matches",
    retrievedComment.author.username,
    authorAuth.username,
  );
  // 11. Verify author's karma has decreased (started at 0, now -1)
  TestValidator.equals(
    "author karma decreased due to downvote",
    retrievedComment.author.karma,
    -1,
  );
}
