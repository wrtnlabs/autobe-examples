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

export async function test_api_comment_vote_upvote_removal(
  connection: api.IConnection,
): Promise<void> {
  // Setup Member1 (comment author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // Create post
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      member1Connection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Create comment
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      member1Connection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Setup Member2 (voter)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // Member2 casts upvote
  const upvote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      member2Connection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(upvote);
  TestValidator.equals("upvote created", upvote.voteType, "upvote");
  // Member2 removes the upvote
  await api.functional.communityPlatform.member.posts.comments.vote.erase(
    member2Connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // Verify Member2 can cast a new vote after removal
  // This proves the vote record was hard-deleted
  const newVote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      member2Connection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: { vote_type: "downvote" },
      },
    );
  typia.assert(newVote);
  TestValidator.equals(
    "new vote created after removal",
    newVote.voteType,
    "downvote",
  );
}
