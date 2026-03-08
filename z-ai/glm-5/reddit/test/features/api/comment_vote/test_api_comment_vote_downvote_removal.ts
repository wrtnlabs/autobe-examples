import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_downvote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author member joins the platform
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Author creates a new community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to their own community
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(authorSubscription);
  // 4. Author creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        title: RandomGenerator.name(),
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on the post
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
  // 6. Voter member joins the platform
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 7. Voter subscribes to the same community
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(voterSubscription);
  // 8. Voter casts a downvote on the author's comment
  const downvotedComment =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvotedComment);
  // Verify downvote was applied - score should decrease by 1
  TestValidator.equals(
    "comment score after downvote",
    downvotedComment.score,
    comment.score - 1,
  );
  // 9. Voter removes the downvote (DELETE endpoint returns void - 204 No Content)
  await api.functional.communityPlatform.member.comments._vote.erase(
    voterConnection,
    {
      commentId: comment.id,
    },
  );
  // 10. Verify voter can cast a new vote on the same comment after removal
  // This proves the downvote was successfully removed - if it wasn't,
  // re-voting would either fail or behave differently
  const newVoteComment =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          voteType: "upvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(newVoteComment);
  // Verify new upvote was applied - score should be baseline + 1
  TestValidator.equals(
    "comment score after new upvote",
    newVoteComment.score,
    comment.score + 1,
  );
}
