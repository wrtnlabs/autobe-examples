import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReplies";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_reply_update_by_member_with_authorization(
  connection: api.IConnection,
) {
  // 1. Member registration via join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "Password123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: initialPassword,
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create discussion board category by admin
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: `Category-${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`,
          description: `Test category description for ${member.display_name}`,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member creates a discussion board post under the category
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Member creates a reply to this post
  const replyCreateBody = {
    post_id: post.id,
    member_id: member.id,
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;
  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // 5. Member updates their reply content and status
  const replyUpdateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }),
    reply_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardReplies.IUpdate;
  const updatedReply: IDiscussionBoardDiscussionBoardReplies =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByPostidAndReplyid(
      connection,
      {
        postId: post.id,
        replyId: reply.id,
        body: replyUpdateBody,
      },
    );
  typia.assert(updatedReply);

  // 6. Validate updated content and status
  TestValidator.equals(
    "reply id should remain same",
    updatedReply.id,
    reply.id,
  );
  TestValidator.equals(
    "reply post_id should remain same",
    updatedReply.post_id,
    post.id,
  );
  TestValidator.equals(
    "reply member_id should remain same",
    updatedReply.member_id,
    member.id,
  );
  TestValidator.equals(
    "reply content should be updated",
    updatedReply.content,
    replyUpdateBody.content,
  );
  TestValidator.equals(
    "reply status should be updated",
    updatedReply.reply_status,
    replyUpdateBody.reply_status,
  );
  // Validate timestamps presence
  TestValidator.predicate(
    "created_at should be ISO string",
    typeof updatedReply.created_at === "string" &&
      updatedReply.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at should be ISO string",
    typeof updatedReply.updated_at === "string" &&
      updatedReply.updated_at.length > 10,
  );
  // deleted_at should be null or undefined
  if (
    updatedReply.deleted_at !== undefined &&
    updatedReply.deleted_at !== null
  ) {
    throw new Error("deleted_at should be null or undefined");
  }
}
