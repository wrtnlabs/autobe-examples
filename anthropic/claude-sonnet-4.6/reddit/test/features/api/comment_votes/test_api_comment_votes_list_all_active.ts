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

export async function test_api_comment_votes_list_all_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A: register (owns community, post, comment)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
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
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Member B: register (will upvote)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 7. Member B casts an upvote on the comment
  const upvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { voteType: "up" },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(upvote);
  // 8. Member C: register (will downvote)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 9. Member C casts a downvote on the comment
  const downvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberCConnection,
      {
        body: { voteType: "down" },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(downvote);
  // Target call: list all active votes on the comment (no filter, defaults)
  const votePage = await api.functional.community.posts.comments.votes.index(
    memberAConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: {} satisfies ICommunityCommentVote.IRequest,
    },
  );
  typia.assert(votePage);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination.records equals 2",
    votePage.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination.current equals 1",
    votePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 20",
    votePage.pagination.limit,
    20,
  );
  // Validate data array
  TestValidator.equals("data array length equals 2", votePage.data.length, 2);
  // Validate one upvote and one downvote are present
  const upvoteEntry = votePage.data.find((v) => v.vote_type === "up");
  const downvoteEntry = votePage.data.find((v) => v.vote_type === "down");
  TestValidator.predicate("upvote entry exists", upvoteEntry !== undefined);
  TestValidator.predicate("downvote entry exists", downvoteEntry !== undefined);
  // Validate upvote member matches member B
  TestValidator.equals(
    "upvote member id matches member B",
    upvoteEntry!.member.id,
    upvote.member.id,
  );
  // Validate downvote member matches member C
  TestValidator.equals(
    "downvote member id matches member C",
    downvoteEntry!.member.id,
    downvote.member.id,
  );
}
