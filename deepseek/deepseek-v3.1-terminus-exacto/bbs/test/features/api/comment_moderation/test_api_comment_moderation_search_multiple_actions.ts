import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_comments_moderations_create";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

export async function test_api_comment_moderation_search_multiple_actions(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple administrator connections using utility functions
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Use a realistic comment ID from the system context
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple moderation actions using utility functions
  const moderation1 =
    await generate_random_discussion_board_admin_comments_moderations_create(
      admin1Connection,
      {
        params: { commentId },
        body: {
          action_type: "edit",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "completed",
          discussion_board_comment_id: commentId,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation1);
  const moderation2 =
    await generate_random_discussion_board_admin_comments_moderations_create(
      admin2Connection,
      {
        params: { commentId },
        body: {
          action_type: "delete",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "completed",
          discussion_board_comment_id: commentId,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation2);
  const moderation3 =
    await generate_random_discussion_board_admin_comments_moderations_create(
      admin1Connection,
      {
        params: { commentId },
        body: {
          action_type: "approve",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending",
          discussion_board_comment_id: commentId,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation3);
  // Test 1: Search all moderation actions using admin-specific connection
  const allResults =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      admin1Connection,
      {
        commentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(allResults);
  TestValidator.predicate(
    "should return paginated results",
    allResults.data.length > 0,
  );
  TestValidator.predicate(
    "should have correct pagination metadata",
    allResults.pagination.records >= allResults.data.length,
  );
  // Test 2: Filter by action type
  const editResults =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      admin1Connection,
      {
        commentId,
        body: {
          action_type: "edit",
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(editResults);
  TestValidator.predicate(
    "should return only edit actions",
    editResults.data.every((item) => item.action_type === "edit"),
  );
  // Test 3: Filter by status
  const completedResults =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      admin1Connection,
      {
        commentId,
        body: {
          status: "completed",
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(completedResults);
  TestValidator.predicate(
    "should return only completed actions",
    completedResults.data.every((item) => item.status === "completed"),
  );
  // Test 4: Filter by specific admin email
  const adminEmailResults =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      admin1Connection,
      {
        commentId,
        body: {
          admin_email: admin1.email,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(adminEmailResults);
  TestValidator.predicate(
    "should return actions by specific admin",
    adminEmailResults.data.every((item) => item.admin.email === admin1.email),
  );
  // Test 5: Validate pagination limits
  const limitedResults =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      admin1Connection,
      {
        commentId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.predicate(
    "should respect limit parameter",
    limitedResults.data.length <= 1,
  );
  // Test 6: Validate audit trail completeness
  editResults.data.forEach((moderation) => {
    TestValidator.predicate(
      "moderation record should have ID",
      moderation.id.length > 0,
    );
    TestValidator.predicate(
      "moderation should have valid action type",
      ["edit", "delete", "approve"].includes(moderation.action_type),
    );
    TestValidator.predicate(
      "moderation should have reason text",
      moderation.reason.length > 0,
    );
    TestValidator.predicate(
      "moderation should have status",
      ["pending", "completed", "reversed"].includes(moderation.status),
    );
    TestValidator.predicate(
      "moderation should have timestamp",
      moderation.created_at.length > 0,
    );
    TestValidator.predicate(
      "moderation should have admin ID",
      moderation.admin.id.length > 0,
    );
    TestValidator.predicate(
      "moderation should have admin email",
      moderation.admin.email.includes("@"),
    );
    TestValidator.predicate(
      "moderation should have admin display name",
      moderation.admin.display_name.length > 0,
    );
  });
}
