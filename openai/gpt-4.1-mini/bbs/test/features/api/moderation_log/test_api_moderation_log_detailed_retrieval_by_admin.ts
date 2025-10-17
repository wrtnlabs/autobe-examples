import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

export async function test_api_moderation_log_detailed_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a discussion board category
  const categoryName = RandomGenerator.name(1);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Member creates a new discussion board post
  const postTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 12,
  });
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

  // 4. Member posts a reply to the discussion board post
  const replyContent = RandomGenerator.paragraph({ sentences: 8 });
  const replyStatus = "public";

  const reply: IDiscussionBoardDiscussionBoardReply =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByDiscussionboardpostid(
      connection,
      {
        discussionBoardPostId: post.id,
        body: {
          post_id: post.id,
          member_id: typia.random<string & tags.Format<"uuid">>(),
          content: replyContent,
          reply_status: replyStatus,
        } satisfies IDiscussionBoardDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // 5. Admin retrieves detailed moderation log entry by moderationLogId
  //   Since creation of moderation log via API is not available, we simulate
  //   by querying a random valid UUID
  const moderationLogId = typia.random<string & tags.Format<"uuid">>();

  const moderationLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.admin.discussionBoard.moderationLogs.at(
      connection,
      {
        moderationLogId: moderationLogId,
      },
    );
  typia.assert(moderationLog);

  // 6. Validate moderation log id format
  TestValidator.predicate(
    "moderation log id has proper uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationLog.id,
    ),
  );

  // 7. Validate error handling for invalid moderationLogId
  await TestValidator.error(
    "fetch with invalid moderationLogId should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoard.moderationLogs.at(
        connection,
        {
          moderationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
