import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_bbs_moderator_comments_create } from "../../../generate/generate_random_community_bbs_moderator_comments_create";
import { generate_random_community_bbs_moderator_comments_replies_create } from "../../../generate/generate_random_community_bbs_moderator_comments_replies_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_reply_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: typia.random<string>(),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 3: Create community
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Create post
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 5: Create comment on post
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_moderator_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 6: Create reply to comment as member
  const originalReply: ICommunityBbsCommentReply =
    await generate_random_community_bbs_moderator_comments_replies_create(
      memberConnection,
      {
        body: {},
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(originalReply);
  // Step 7: Update reply content and status using moderator privileges
  // Per ICommunityBbsCommentReply.IUpdate definition, both content and status are required
  const updatedReplyContent = originalReply.content; // Preserve original content
  const updatedReplyData =
    await api.functional.communityBbs.moderator.comments.replies.update(
      moderatorConnection,
      {
        commentId: comment.id,
        replyId: originalReply.id,
        body: {
          // Update both required properties per IUpdate schema
          content: updatedReplyContent,
          status: "moderated", // Set status to moderated as required by scenario
        } satisfies ICommunityBbsCommentReply.IUpdate,
      },
    );
  const updatedReply: ICommunityBbsCommentReply =
    typia.assert<ICommunityBbsCommentReply>(updatedReplyData);
  // Step 8: Verify update using valid properties from ICommunityBbsCommentReply
  // The only fields we can validate are content, id, comment_id, and author
  const originalReplyData =
    typia.assert<ICommunityBbsCommentReply>(originalReply);
  // Verify that the content was preserved (unchanged)
  TestValidator.equals(
    "reply content should remain unchanged after update",
    updatedReply.content,
    originalReplyData.content,
  );
  // Since status property doesn't exist on ICommunityBbsCommentReply response type,
  // we cannot directly verify it. Instead, we rely on the successful update call
  // and typia.assert to validate the structural integrity of the response.
  // Verify that the reply ID remained the same
  TestValidator.equals(
    "reply id should remain the same after update",
    updatedReply.id,
    originalReplyData.id,
  );
  // Verify that the comment ID remained the same
  TestValidator.equals(
    "comment id should remain the same after update",
    updatedReply.comment_id,
    originalReplyData.comment_id,
  );
  // Verify that the author did not change (moderator updated content, not ownership)
  TestValidator.equals(
    "reply author should remain unchanged",
    updatedReply.author.id,
    originalReplyData.author.id,
  );
}
