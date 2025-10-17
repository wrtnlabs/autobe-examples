import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_discussion_board_reply_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator registration and authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator login explicitly (simulate role switching)
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 2. Admin registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 3. Member registration, authentication, and post & reply creation
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Member login
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Create discussion board category by admin
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: "Economic",
          description: "Category for economic discussions",
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Member creates a discussion board post under the created category
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 18,
    wordMin: 4,
    wordMax: 8,
  });
  const postStatus = "public";

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category.id,
          title:
            postTitle.length >= 5 && postTitle.length <= 100
              ? postTitle
              : "Valid post title",
          body:
            postBody.length <= 5000
              ? postBody
              : "Valid content body with acceptable length",
          post_status: postStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post.category_id matches category.id",
    post.category_id,
    category.id,
  );
  TestValidator.equals(
    "post.title length within range",
    true,
    post.title.length >= 5 && post.title.length <= 100,
  );
  TestValidator.equals(
    "post.body length within limit",
    true,
    post.body.length <= 5000,
  );
  TestValidator.equals("post status", post.post_status, postStatus);

  // Member creates a reply for the post
  const replyContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 9,
  });
  const replyStatus = "public";
  const replyCreateBody: IDiscussionBoardDiscussionBoardReply.ICreate = {
    post_id: post.id,
    member_id: member.id,
    content:
      replyContent.length >= 5 && replyContent.length <= 1000
        ? replyContent
        : "Valid reply content",
    reply_status: replyStatus,
  };

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
      connection,
      {
        postId: post.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);
  TestValidator.equals(
    "reply.content length within range",
    true,
    reply.content.length >= 5 && reply.content.length <= 1000,
  );
  TestValidator.equals(
    "reply.reply_status is public",
    reply.reply_status,
    replyStatus,
  );

  // 4. Switch to moderator login for updating the reply
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Update reply content and status by moderator
  const moderatedContent = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 8,
    wordMax: 12,
  });
  const moderatedStatus = "moderated"; // Assuming this is a valid status representing moderation

  const updateBody: IDiscussionBoardDiscussionBoardReply.IUpdate = {
    content:
      moderatedContent.length >= 5 && moderatedContent.length <= 1000
        ? moderatedContent
        : "Moderated reply content",
    reply_status: moderatedStatus,
  };

  const updatedReply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.putByDiscussionboardpostidAndDiscussionboardreplyid(
      connection,
      {
        discussionBoardPostId: post.id,
        discussionBoardReplyId: reply.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReply);
  TestValidator.equals(
    "updated reply content matches",
    updatedReply.content,
    updateBody.content,
  );
  TestValidator.equals(
    "updated reply status matches",
    updatedReply.reply_status,
    updateBody.reply_status,
  );
}
