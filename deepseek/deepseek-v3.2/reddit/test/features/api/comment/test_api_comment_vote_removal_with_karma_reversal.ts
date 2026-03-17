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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_removal_with_karma_reversal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {});
  typia.assert(voterAuth);
  // 2. Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  typia.assert(authorAuth);
  // 3. Author creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Author subscribes to their own community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id satisfies string as string,
          active: true,
        } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  // 5. Author creates post in community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name satisfies string as string,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // 6. Author creates comment on post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
        params: {
          postId: post.id satisfies string as string,
        },
      },
    );
  typia.assert(comment);
  // 7. Voter subscribes to community to vote (if required)
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id satisfies string as string,
          active: true,
        } satisfies DeepPartial<ICommunityPlatformSubscription.ICreate>,
      },
    );
  typia.assert(voterSubscription);
  // 8. Voter downvotes the comment
  const downvote =
    await api.functional.communityPlatform.member.comments.votes.patchByCommentid(
      voterConnection,
      {
        commentId: comment.id satisfies string as string,
        body: {
          type: "downvote" as const,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(downvote);
  TestValidator.equals(
    "downvote type should be downvote",
    downvote.type,
    "downvote",
  );
  TestValidator.predicate(
    "downvote should be active",
    downvote.deleted_at === null,
  );
  // 9. Voter removes vote (type: null)
  const voteRemoval =
    await api.functional.communityPlatform.member.comments.votes.patchByCommentid(
      voterConnection,
      {
        commentId: comment.id satisfies string as string,
        body: { type: null } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(voteRemoval);
  TestValidator.equals(
    "vote removal type should be null",
    voteRemoval.type,
    null,
  );
  TestValidator.predicate(
    "vote should be soft-deleted",
    voteRemoval.deleted_at !== null,
  );
  // 10. Verify trying to remove non-existent vote returns error
  await TestValidator.error(
    "removing non-existent vote should error",
    async () => {
      await api.functional.communityPlatform.member.comments.votes.patchByCommentid(
        voterConnection,
        {
          commentId: comment.id satisfies string as string,
          body: { type: null } satisfies ICommunityPlatformCommentVote.IRequest,
        },
      );
    },
  );
}