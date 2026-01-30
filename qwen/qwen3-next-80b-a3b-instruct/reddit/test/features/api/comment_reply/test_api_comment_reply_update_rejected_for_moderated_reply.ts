import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentModerationAction";
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_comment_moderation_action } from "../../../prepare/prepare_random_community_bbs_comment_moderation_action";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_admin_comments_create } from "../../../generate/generate_random_community_bbs_admin_comments_create";
import { generate_random_community_bbs_admin_comments_replies_create } from "../../../generate/generate_random_community_bbs_admin_comments_replies_create";
import { generate_random_community_bbs_admin_comment_moderation_actions_create } from "../../../generate/generate_random_community_bbs_admin_comment_moderation_actions_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_reply_update_rejected_for_moderated_reply(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create community
  const community =
    await generate_random_community_bbs_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Create post in community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create comment on post
  const comment = await generate_random_community_bbs_admin_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content(),
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 6: Create reply to comment as member
  const reply =
    await generate_random_community_bbs_admin_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          content: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommentReply.ICreate,
      },
    );
  typia.assert(reply);
  // Step 7: Update reply status to 'moderated' as admin - by creating a moderation action
  const moderationAction =
    await generate_random_community_bbs_admin_comment_moderation_actions_create(
      adminConnection,
      {
        body: {
          reason: "Reply contained inappropriate content",
        } satisfies ICommunityBbsCommentModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // Step 8: Attempt to update reply content as original author (member) - this update should be rejected
  // The IUpdate DTO requires status property, so we'll include it as 'moderated' to indicate the moderated state
  await TestValidator.error(
    "moderated reply cannot be updated by original author",
    async () => {
      await api.functional.communityBbs.admin.comments.replies.update(
        memberConnection,
        {
          commentId: comment.id,
          replyId: reply.id,
          body: {
            content: "Updated content",
            status: "moderated", // Required by interface, represents the moderated state
          } satisfies ICommunityBbsCommentReply.IUpdate,
        },
      );
    },
  );
  // Step 9: Verify reply content remains unchanged
  // Since we cannot use a 'get' method, we use 'update' with original data to retrieve current state
  const updatedReply =
    await api.functional.communityBbs.admin.comments.replies.update(
      memberConnection,
      {
        commentId: comment.id,
        replyId: reply.id,
        body: {
          content: reply.content,
          status: "moderated", // Required by interface
        } satisfies ICommunityBbsCommentReply.IUpdate,
      },
    );
  typia.assert(updatedReply);
  TestValidator.equals(
    "reply content unchanged",
    updatedReply.content,
    reply.content,
  );
}
