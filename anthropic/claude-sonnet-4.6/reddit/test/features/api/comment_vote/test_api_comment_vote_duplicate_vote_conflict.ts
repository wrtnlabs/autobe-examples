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

export async function test_api_comment_vote_duplicate_vote_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (comment author)
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
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Register Member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 1: Member B casts an upvote on the comment — must succeed
  const firstVote =
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
  typia.assert(firstVote);
  // Validate first vote properties
  TestValidator.equals("first vote type is up", firstVote.vote_type, "up");
  TestValidator.equals(
    "first vote deleted_at is null",
    firstVote.deleted_at,
    null,
  );
  // Step 2: Member B attempts to cast another vote on the same comment — must fail with 409
  await TestValidator.httpError(
    "duplicate vote must result in 409 conflict",
    409,
    async () => {
      await generate_random_community_member_posts_comments_votes_create(
        memberBConnection,
        {
          body: { voteType: "down" },
          params: {
            postId: post.id,
            commentId: comment.id,
          },
        },
      );
    },
  );
}
