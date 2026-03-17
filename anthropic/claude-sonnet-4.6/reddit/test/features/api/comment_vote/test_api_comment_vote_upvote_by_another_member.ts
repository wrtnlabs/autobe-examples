import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { generate_random_community_member_posts_comments_votes_create } from "../../../generate/generate_random_community_member_posts_comments_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_vote_upvote_by_another_member(
  connection: api.IConnection,
): Promise<void> {
  // ── Member A: community owner, post author, comment author ──────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Member A subscribes to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Member A creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Member A creates the first top-level comment (will be upvoted by Member B)
  const commentA1 =
    await generate_random_community_member_posts_comments_create(
      memberAConnection,
      { params: { postId: post.id } },
    );
  typia.assert(commentA1);
  // Member A creates a second comment (will be downvoted by Member B)
  const commentA2 =
    await generate_random_community_member_posts_comments_create(
      memberAConnection,
      { params: { postId: post.id } },
    );
  typia.assert(commentA2);
  // ── Member B: voter ──────────────────────────────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // ── Test: Member B upvotes Member A's first comment ─────────────────────
  const upvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { voteType: "up" },
        params: { postId: post.id, commentId: commentA1.id },
      },
    );
  typia.assert(upvote);
  // Validate upvote response fields
  TestValidator.equals("upvote vote_type", upvote.vote_type, "up");
  TestValidator.equals("upvote member id", upvote.member.id, memberB.id);
  TestValidator.equals("upvote comment id", upvote.comment.id, commentA1.id);
  TestValidator.equals("upvote deleted_at is null", upvote.deleted_at, null);
  // ── Test: Member B downvotes Member A's second comment ───────────────────
  const downvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { voteType: "down" },
        params: { postId: post.id, commentId: commentA2.id },
      },
    );
  typia.assert(downvote);
  // Validate downvote response fields
  TestValidator.equals("downvote vote_type", downvote.vote_type, "down");
  TestValidator.equals("downvote member id", downvote.member.id, memberB.id);
  TestValidator.equals(
    "downvote comment id",
    downvote.comment.id,
    commentA2.id,
  );
  TestValidator.equals(
    "downvote deleted_at is null",
    downvote.deleted_at,
    null,
  );
}
