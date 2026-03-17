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

export async function test_api_comment_vote_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (the comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A subscribes to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Register Member B (the voter) — different account, cannot vote on own comment
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 7. Member B casts an upvote on Member A's comment
  const vote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { voteType: "up" },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(vote);
  // Test Execution: retrieve the vote by its ID (public endpoint, no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.community.posts.comments.votes.at(
    publicConnection,
    {
      postId: post.id,
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  typia.assert(retrieved);
  // Validations
  TestValidator.equals("vote id matches", retrieved.id, vote.id);
  TestValidator.equals("vote type is upvote", retrieved.vote_type, "up");
  TestValidator.equals(
    "voter member id matches Member B",
    retrieved.member.id,
    memberB.id,
  );
  TestValidator.equals("comment id matches", retrieved.comment.id, comment.id);
  TestValidator.equals(
    "vote is active (not deleted)",
    retrieved.deleted_at,
    null,
  );
}
