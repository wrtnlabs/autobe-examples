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
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comments_replies_create } from "../../../generate/generate_random_community_bbs_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_reply_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create parent comment
  const parentComment =
    await generate_random_community_bbs_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Step 3: Create reply to be updated
  const reply =
    await generate_random_community_bbs_member_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: parentComment.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommentReply.ICreate,
      },
    );
  typia.assert(reply);
  // Step 4: Update reply content with new content
  const updatedReply =
    await api.functional.communityBbs.member.comments.replies.update(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
        body: {
          content: "Updated content for the reply",
          status: 'active',
        } satisfies ICommunityBbsCommentReply.IUpdate,
      },
    );
  typia.assert(updatedReply);
  // Step 5: Validate that the reply was updated correctly
  TestValidator.equals(
    "reply content updated",
    updatedReply.content,
    "Updated content for the reply",
  );
  // Step 6: Verify the original author is preserved
  TestValidator.equals(
    "author preserved",
    updatedReply.author_id,
    reply.author_id,
  );
  // Step 7: Validate that the original comment_id is preserved
  TestValidator.equals(
    "comment_id preserved",
    updatedReply.comment_id,
    reply.comment_id,
  );
}