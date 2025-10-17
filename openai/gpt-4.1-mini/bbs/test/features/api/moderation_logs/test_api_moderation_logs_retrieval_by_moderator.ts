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
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Validates that a moderator user can retrieve filtered moderation logs from
 * the discussion board system.
 *
 * This end-to-end test follows the full multi-role workflow:
 *
 * 1. Registers and authenticates a moderator account to obtain authentication
 *    tokens.
 * 2. Registers and authenticates an admin account to create a new discussion board
 *    category.
 * 3. Registers and authenticates a member account who will submit a post and post
 *    a reply.
 * 4. The moderator user switches authentication and requests moderation logs
 *    filtered by action type, moderator id, post id, and reply id.
 *
 * Each step includes appropriate type assertions using typia.assert and
 * meaningful TestValidator assertions for validation of API functionality and
 * data.
 */
export async function test_api_moderation_logs_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator account registration and authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "P@ssw0rd123";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Admin account registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd123";

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Admin user login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 4. Create a discussion board category
  const categoryCreateBody = {
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 5. Member account registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd123";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 6. Member user login
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 7. Create a discussion board post as member
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 8. Create a discussion board reply as member
  const replyCreateBody = {
    post_id: post.id,
    member_id: member.id,
    content: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 9. Switch authentication to moderator using login
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 10. Retrieve moderation logs filtered by relevant criteria as moderator
  const requestBody: IDiscussionBoardModerationLog.IRequest = {
    page: 1,
    limit: 15,
    search: null,
    action_type: "edit",
    moderator_id: moderator.id,
    post_id: post.id,
    reply_id: reply.id,
    order_by: "created_at_desc",
  };

  const moderationLogs: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.discussionBoard.moderationLogs.index(
      connection,
      { body: requestBody },
    );
  typia.assert(moderationLogs);

  TestValidator.predicate(
    "pagination current page is 1",
    moderationLogs.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 15",
    moderationLogs.pagination.limit === 15,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    moderationLogs.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    moderationLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data array is array",
    Array.isArray(moderationLogs.data),
  );
  TestValidator.predicate(
    "data array contains summary items or empty",
    moderationLogs.data.every((item) => typeof item === "object"),
  );
}
