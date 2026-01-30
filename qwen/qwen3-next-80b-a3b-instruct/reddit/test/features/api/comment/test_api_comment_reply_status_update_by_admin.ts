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
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_admin_comments_create } from "../../../generate/generate_random_community_bbs_admin_comments_create";
import { generate_random_community_bbs_admin_comments_replies_create } from "../../../generate/generate_random_community_bbs_admin_comments_replies_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_reply_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connections for member and admin
  const memberConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate member (create account)
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // Step 3: Authenticate admin (create account)
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Step 4: Login as member to create community
  await authorize_member_login(memberConnection, { body: memberCredentials });
  // Step 5: Create community
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 6: Login as member to create post
  await authorize_member_login(memberConnection, { body: memberCredentials });
  // Step 7: Create post in community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 8: Login as member to create comment
  await authorize_member_login(memberConnection, { body: memberCredentials });
  // Step 9: Create comment on post
  const comment = await generate_random_community_bbs_admin_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 10: Login as member to create reply to comment
  await authorize_member_login(memberConnection, { body: memberCredentials });
  // Step 11: Create reply to comment
  const reply =
    await generate_random_community_bbs_admin_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityBbsCommentReply.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(reply);
  // Step 12: Login as admin for moderation
  await authorize_admin_login(adminConnection, { body: adminCredentials });
  // Step 13: Update reply status from active to moderated
  const updatedReply =
    await api.functional.communityBbs.admin.comments.replies.update(
      adminConnection,
      {
        commentId: comment.id,
        replyId: reply.id,
        body: {
          content: reply.content, // Keep content unchanged
          status: "moderated", // Update status to moderated
        } satisfies ICommunityBbsCommentReply.IUpdate,
      },
    );
  // Strip any non-existent properties and use the actual response structure
  const validatedResponse = typia.assert<ICommunityBbsCommentReply>(updatedReply);
  // Step 14: Validate that status changed to moderated - using any assertion for missing type properties
  const anyReply = updatedReply as any;
  TestValidator.equals(
    "reply status updated to moderated",
    anyReply.status,
    "moderated",
  );
  // Step 15: Validate that content remained unchanged
  TestValidator.equals(
    "reply content unchanged",
    validatedResponse.content,
    reply.content,
  );
  // Step 16: Validate that updated_at was updated (must be different from original created_at)
  TestValidator.predicate(
    "updated_at exists",
    () => anyReply.updated_at !== null,
  );
  TestValidator.notEquals(
    "updated_at differs from created_at",
    anyReply.created_at,
    anyReply.updated_at,
  );
}