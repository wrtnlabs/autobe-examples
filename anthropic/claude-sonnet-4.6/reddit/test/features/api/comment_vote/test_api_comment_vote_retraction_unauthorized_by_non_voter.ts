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

export async function test_api_comment_vote_retraction_unauthorized_by_non_voter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (community/post/comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Register Member B (the voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Register Member C (unauthorized actor)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 4. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 5. Member A subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 6. Member A creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Member A creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 8. Member B casts an upvote on the comment
  const vote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { voteType: "up" },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(vote);
  // 9. Member C attempts to retract Member B's vote → expect HTTP 403
  await TestValidator.httpError(
    "non-voter cannot retract another member's vote",
    403,
    async () => {
      await api.functional.community.member.posts.comments.votes.erase(
        memberCConnection,
        {
          postId: post.id,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
  // 10. Member B (the original voter) retracts their own vote → expect success
  await api.functional.community.member.posts.comments.votes.erase(
    memberBConnection,
    {
      postId: post.id,
      commentId: comment.id,
      voteId: vote.id,
    },
  );
}
