import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberA = await authorize_member_join(memberAConnection, {
    body: memberAJoinInput,
  });
  const initialKarma: number = memberA.profile.karma satisfies number as number;
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Member A subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    { params: { communityId: community.id } },
  );
  // 4. Member A creates a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  const initialVoteScore: number = comment.voteScore satisfies number as number;
  // 6. Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 7. Member B upvotes (+1) the comment
  const upvoteResult =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { value: 1 },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(upvoteResult);
  TestValidator.equals("upvote value", upvoteResult.value, 1);
  TestValidator.equals(
    "comment vote_score after upvote",
    upvoteResult.comment.vote_score,
    initialVoteScore + 1,
  );
  // Check Member A's karma increased by 1 after the upvote
  const memberACheck1Connection: api.IConnection = { host: connection.host };
  const memberARefresh1 = await authorize_member_login(
    memberACheck1Connection,
    {
      body: {
        email: memberA.email,
        password: memberAJoinInput.password,
        href: memberAJoinInput.href,
        referrer: memberAJoinInput.referrer,
      },
    },
  );
  TestValidator.equals(
    "Member A karma after upvote",
    memberARefresh1.profile.karma,
    initialKarma + 1,
  );
  // 8. Member B changes vote to downvote (-1) — triggers upsert
  const downvoteResult =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { value: -1 },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(downvoteResult);
  TestValidator.equals("downvote value after change", downvoteResult.value, -1);
  TestValidator.predicate(
    "updated_at changed after vote direction change",
    () => downvoteResult.updated_at > downvoteResult.created_at,
  );
  TestValidator.equals(
    "comment vote_score after changing from upvote to downvote (net -2)",
    downvoteResult.comment.vote_score,
    initialVoteScore + 1 - 2,
  );
  // Check Member A's karma decreased by 2 (net change from +1 to -1)
  const memberACheck2Connection: api.IConnection = { host: connection.host };
  const memberARefresh2 = await authorize_member_login(
    memberACheck2Connection,
    {
      body: {
        email: memberA.email,
        password: memberAJoinInput.password,
        href: memberAJoinInput.href,
        referrer: memberAJoinInput.referrer,
      },
    },
  );
  TestValidator.equals(
    "Member A karma after vote change to downvote (net -2)",
    memberARefresh2.profile.karma,
    initialKarma + 1 - 2,
  );
}
