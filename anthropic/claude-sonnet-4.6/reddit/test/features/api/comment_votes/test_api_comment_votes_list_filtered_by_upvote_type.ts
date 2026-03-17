import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentVote";
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

export async function test_api_comment_votes_list_filtered_by_upvote_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (will create community, post, comment)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(comment);
  // 6. Register member B (will cast upvote)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 7. Member B casts an upvote on the comment
  const upvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: {
          voteType: "up",
        },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(upvote);
  // 8. Register member C (will cast downvote)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 9. Member C casts a downvote on the comment
  const downvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberCConnection,
      {
        body: {
          voteType: "down",
        },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvote);
  // Guest connection for public vote listing (no auth required)
  const guestConnection: api.IConnection = { host: connection.host };
  // === Filter by 'up' ===
  const upvoteFilterResult =
    await api.functional.community.posts.comments.votes.index(guestConnection, {
      postId: post.id,
      commentId: comment.id,
      body: {
        voteType: "up",
      } satisfies ICommunityCommentVote.IRequest,
    });
  typia.assert(upvoteFilterResult);
  // Verify pagination.records === 1 (only the upvote)
  TestValidator.equals(
    "upvote filter: pagination records should be 1",
    upvoteFilterResult.pagination.records,
    1,
  );
  // Verify data array has exactly 1 entry
  TestValidator.equals(
    "upvote filter: data length should be 1",
    upvoteFilterResult.data.length,
    1,
  );
  // Verify the entry has vote_type === 'up'
  TestValidator.equals(
    "upvote filter: entry vote_type should be 'up'",
    upvoteFilterResult.data[0]!.vote_type,
    "up",
  );
  // Verify the entry belongs to member B
  TestValidator.equals(
    "upvote filter: entry member id should be member B's id",
    upvoteFilterResult.data[0]!.member.id,
    memberB.id,
  );
  // Verify no downvote entries in data
  TestValidator.predicate(
    "upvote filter: no downvote entries in data",
    upvoteFilterResult.data.every((v) => v.vote_type === "up"),
  );
  // === Filter by 'down' ===
  const downvoteFilterResult =
    await api.functional.community.posts.comments.votes.index(guestConnection, {
      postId: post.id,
      commentId: comment.id,
      body: {
        voteType: "down",
      } satisfies ICommunityCommentVote.IRequest,
    });
  typia.assert(downvoteFilterResult);
  // Verify pagination.records === 1 (only the downvote)
  TestValidator.equals(
    "downvote filter: pagination records should be 1",
    downvoteFilterResult.pagination.records,
    1,
  );
  // Verify data array has exactly 1 entry
  TestValidator.equals(
    "downvote filter: data length should be 1",
    downvoteFilterResult.data.length,
    1,
  );
  // Verify the entry has vote_type === 'down'
  TestValidator.equals(
    "downvote filter: entry vote_type should be 'down'",
    downvoteFilterResult.data[0]!.vote_type,
    "down",
  );
  // Verify the entry belongs to member C
  TestValidator.equals(
    "downvote filter: entry member id should be member C's id",
    downvoteFilterResult.data[0]!.member.id,
    memberC.id,
  );
  // Verify no upvote entries in data
  TestValidator.predicate(
    "downvote filter: no upvote entries in data",
    downvoteFilterResult.data.every((v) => v.vote_type === "down"),
  );
}
