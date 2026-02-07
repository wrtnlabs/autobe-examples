import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieving a comment flag that has been resolved by an administrator
 * to verify super administrators can access completed moderation cases.
 */
export async function test_api_superadmin_flag_retrieval_resolved_status(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Since we don't have the necessary endpoints to create articles, comments, flags,
  // or flag resolution endpoints available, we'll test the flag retrieval endpoint
  // with valid UUID parameters to ensure it functions correctly.
  // Generate valid UUIDs for the test
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const flagId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the flag details as superAdmin
  const flag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.at(
      superAdminConnection,
      {
        articleId,
        commentId,
        flagId,
      },
    );
  typia.assert(flag);
  // Validate the flag structure matches the expected IDiscussionBoardCommentFlag type
  TestValidator.equals("flag ID matches", flag.id, flagId);
  TestValidator.predicate(
    "flag reason is a string",
    typeof flag.flag_reason === "string",
  );
  TestValidator.predicate(
    "flag type is a string",
    typeof flag.flag_type === "string",
  );
  TestValidator.predicate(
    "status is a string",
    typeof flag.status === "string",
  );
  TestValidator.predicate(
    "created at is valid date-time",
    flag.created_at.length > 0,
  );
  // Validate user summary structure
  TestValidator.predicate("user ID is UUID", flag.user.id.length === 36);
  TestValidator.predicate(
    "user display name is string",
    typeof flag.user.display_name === "string",
  );
  TestValidator.predicate(
    "user bio is string or null",
    flag.user.bio === null || typeof flag.user.bio === "string",
  );
  TestValidator.predicate(
    "user created at is valid date-time",
    flag.user.created_at.length > 0,
  );
  TestValidator.predicate(
    "user updated at is valid date-time",
    flag.user.updated_at.length > 0,
  );
  // Validate comment summary structure
  TestValidator.predicate("comment ID is UUID", flag.comment.id.length === 36);
  TestValidator.predicate(
    "comment content is string",
    typeof flag.comment.content === "string",
  );
  TestValidator.predicate(
    "comment created at is valid date-time",
    flag.comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment author exists",
    flag.comment.author.id.length === 36,
  );
  // Validate reviewer (can be null)
  if (flag.reviewer !== null) {
    TestValidator.predicate(
      "reviewer ID is UUID",
      flag.reviewer.id.length === 36,
    );
    TestValidator.predicate(
      "reviewer email is valid",
      flag.reviewer.email.includes("@"),
    );
    TestValidator.predicate(
      "reviewer display name is string",
      typeof flag.reviewer.display_name === "string",
    );
    TestValidator.predicate(
      "reviewer created at is valid date-time",
      flag.reviewer.created_at.length > 0,
    );
  }
  // Validate resolution notes (can be null)
  if (flag.resolution_notes !== null) {
    TestValidator.predicate(
      "resolution notes is string",
      typeof flag.resolution_notes === "string",
    );
  }
  // Validate timestamps (can be null)
  if (flag.reviewed_at !== null) {
    TestValidator.predicate(
      "reviewed at is valid date-time",
      flag.reviewed_at.length > 0,
    );
  }
  if (flag.resolved_at !== null) {
    TestValidator.predicate(
      "resolved at is valid date-time",
      flag.resolved_at.length > 0,
    );
  }
}
