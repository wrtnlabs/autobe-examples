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
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_reply_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Create a community as admin
  const community: ICommunityBbsCommunity =
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
  // Step 3: Create a post as admin
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(adminConnection, {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Create a comment on the post as admin
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_admin_comments_create(adminConnection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.content(),
      } satisfies ICommunityBbsComment.ICreate,
    });
  typia.assert(comment);
  // Step 5: Create a reply to the comment as admin (simulating member activity)
  const reply: ICommunityBbsCommentReply =
    await generate_random_community_bbs_admin_comments_replies_create(
      adminConnection,
      {
        body: {}, // Use default generated content
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(reply);
  // Step 6: Create moderator connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorJoinResponse = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: moderatorPasswordHash,
      } satisfies ICommunityBbsModerator.IJoin,
    },
  );
  // Step 7: Log in as moderator using the password_hash stored before join
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorJoinResponse.email,
      password_hash: moderatorPasswordHash,
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // Step 8: Delete the reply created by admin (moderator has elevated privileges)
  await api.functional.communityBbs.admin.comments.replies.erase(
    moderatorConnection,
    {
      commentId: comment.id,
      replyId: reply.id,
    },
  );
  // Step 9: Verify the reply is deleted by attempting to delete it again - should fail with 404
  await TestValidator.error(
    "deleting already-deleted reply should fail",
    async () => {
      await api.functional.communityBbs.admin.comments.replies.erase(
        moderatorConnection,
        {
          commentId: comment.id,
          replyId: reply.id,
        },
      );
    },
  );
}
