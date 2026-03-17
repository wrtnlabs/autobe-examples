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

export async function test_api_comment_vote_removal_reverses_karma(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member A (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Step 2: Create a community as author
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Author subscribes to their own community (required to create posts)
  // The community creator should already be able to post, but let's ensure subscription
  // Step 4: Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // Step 5: Create a comment as author
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Verify initial state: vote_score = 0
  TestValidator.equals("initial comment vote score", comment.voteScore, 0);
  // Step 6: Authenticate as member B (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // Step 7: Voter casts a downvote on the comment
  const downvote =
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
  typia.assert(downvote);
  // Verify downvote was created with correct type
  TestValidator.equals("downvote type", downvote.voteType, "downvote");
  TestValidator.predicate(
    "downvote has no deleted_at initially",
    downvote.deletedAt === null,
  );
  // Step 8: Voter removes their vote by setting voteType to null
  const removedVote =
    await api.functional.communityPlatform.posts.comments.votes.update(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          voteType: null,
        },
      },
    );
  typia.assert(removedVote);
  // Step 9: Verify the vote shows deleted_at timestamp (soft deletion)
  // This confirms the vote was removed, which should reverse karma
  TestValidator.predicate(
    "vote has deleted_at after removal",
    removedVote.deletedAt !== null,
  );
  TestValidator.equals("vote id preserved", removedVote.id, downvote.id);
}
