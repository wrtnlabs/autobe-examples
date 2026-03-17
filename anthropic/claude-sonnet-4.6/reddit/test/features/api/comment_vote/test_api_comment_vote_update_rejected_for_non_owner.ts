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

export async function test_api_comment_vote_update_rejected_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member B (comment author & community owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 2: Member B creates a community
  const community = await generate_random_community_member_communities_create(
    memberBConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Member B subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Member B creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberBConnection,
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
  // Step 5: Member B writes a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberBConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // Step 6: Register member A (original voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 7: Member A casts an upvote on member B's comment
  const vote =
    await generate_random_community_member_posts_comments_votes_create(
      memberAConnection,
      {
        body: { voteType: "up" },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(vote);
  // Step 8: Register member C (unauthorized actor)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // Step 9 & 10: Member C attempts to update member A's vote — must be rejected with 403
  await TestValidator.httpError(
    "member C cannot update member A's vote",
    403,
    async () => {
      await api.functional.community.member.posts.comments.votes.update(
        memberCConnection,
        {
          postId: post.id,
          commentId: comment.id,
          voteId: vote.id,
          body: { voteType: "down" } satisfies ICommunityCommentVote.IUpdate,
        },
      );
    },
  );
}
