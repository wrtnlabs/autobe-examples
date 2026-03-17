import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_removal_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8).toLowerCase()}`,
          description: "Test community for vote ownership validation",
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // Step 3: Create and authenticate comment author
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  typia.assert(authorAuth);
  // Author must subscribe to community to create posts
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        active: true,
      } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
    },
  );
  // Step 4: Create post in community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: "Test post for comment voting",
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: "Post content for testing comment vote removal.",
          formatting: "plain",
        },
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // Step 5: Create comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: "Test comment for vote ownership validation.",
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Step 6: Create and authenticate voting member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {});
  typia.assert(voterAuth);
  // Voter must subscribe to community (if needed for voting)
  await generate_random_community_platform_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
        active: true,
      } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
    },
  );
  // Step 7: Voter creates vote on the comment
  const vote =
    await generate_random_community_platform_member_comments_votes_create(
      voterConnection,
      {
        body: {
          type: "upvote",
        } satisfies DeepPartial<ICommunityPlatformCommentVote.ICreate>,
        params: { commentId: comment.id },
      },
    );
  typia.assert(vote);
  // Step 8: Store vote ID for reference
  const voteId = vote.id;
  // Step 9: Attempt to delete vote as comment author (different user) - should fail with 403
  await TestValidator.httpError(
    "should return 403 Forbidden when non-owner tries to delete vote",
    403,
    async () =>
      await api.functional.communityPlatform.member.comments.votes.mine.erase(
        authorConnection,
        {
          commentId: comment.id,
        },
      ),
  );
  // Step 10: Actual vote owner can delete their vote successfully
  await api.functional.communityPlatform.member.comments.votes.mine.erase(
    voterConnection,
    {
      commentId: comment.id,
    },
  );
  // Step 11: Verify vote is actually deleted - subsequent delete should fail with 404
  await TestValidator.httpError(
    "should return 404 after vote is deleted",
    404,
    async () =>
      await api.functional.communityPlatform.member.comments.votes.mine.erase(
        voterConnection,
        {
          commentId: comment.id,
        },
      ),
  );
}
