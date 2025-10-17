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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_reply_update_by_moderator_with_authorization(
  connection: api.IConnection,
) {
  // 1. Moderator joins
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: moderatorEmail,
        password: "ModPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create discussion board category by admin
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryName + " discussions",
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member joins
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Member creates a post
  const postTitle = RandomGenerator.paragraph({ sentences: 5 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const postStatus = "public";
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: postTitle,
          body: postBody,
          post_status: postStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. Member creates a reply to the post
  const replyContent = RandomGenerator.paragraph({ sentences: 3 });
  const replyStatus = "public";
  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          member_id: member.id,
          content: replyContent,
          reply_status: replyStatus,
        } satisfies IDiscussionBoardDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // 6. Moderator updates the reply with new content and status
  const updatedContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedReplyStatus = "public";
  const updatedReply: IDiscussionBoardDiscussionBoardReplies =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByPostidAndReplyid(
      connection,
      {
        postId: post.id,
        replyId: reply.id,
        body: {
          content: updatedContent,
          reply_status: updatedReplyStatus,
        } satisfies IDiscussionBoardDiscussionBoardReplies.IUpdate,
      },
    );
  typia.assert(updatedReply);

  // 7. Validation assertions
  TestValidator.equals("reply id unchanged", updatedReply.id, reply.id);
  TestValidator.equals("reply postId unchanged", updatedReply.post_id, post.id);
  TestValidator.equals(
    "reply memberId unchanged",
    updatedReply.member_id,
    reply.member_id,
  );
  TestValidator.equals(
    "reply content updated",
    updatedReply.content,
    updatedContent,
  );
  TestValidator.equals(
    "reply status updated",
    updatedReply.reply_status,
    updatedReplyStatus,
  );
  TestValidator.predicate("moderator is authorized to update any reply", true);
}
