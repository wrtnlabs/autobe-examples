import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * End-to-end test of moderation report update by administrator. Validates:
 *
 * - Admin can update arbitrary user's report (permission boundary)
 * - Only documentation-allowed fields are updatable (reason, description, status)
 * - System-managed fields (created_at, deleted_at) cannot be updated
 * - Business audit rules (immutable vs. mutable fields)
 * - Error is thrown for invalid status transitions
 *
 * Workflow:
 *
 * 1. Register and login admin; register and login regular user
 * 2. User submits a moderation report (target_type/article, random uuid)
 * 3. Admin updates the report: change reason/description/status
 * 4. Verify update is reflected, and system fields are not changed
 * 5. Attempt illegal status transition and expect error
 */
export async function test_api_moderation_report_admin_update_flow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!1Ab";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
      ip: undefined,
    },
  });
  typia.assert(adminJoin);

  // (Switch to user: register & login)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10) + "!Xz1";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://user.example.com/join",
      referrer: "https://user.example.com/welcome",
      ip: undefined,
    },
  });
  typia.assert(userJoin);

  // 2. User creates moderation report
  const reportCreateBody = {
    target_type: RandomGenerator.pick([
      "article",
      "comment",
      "attachment",
    ] as const),
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.pick([
      "spam",
      "abuse",
      "illegal content",
      "other",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardReport.ICreate;
  const createdReport =
    await api.functional.discussionBoard.user.moderation.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // Switch to admin (login)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
      ip: undefined,
    },
  });
  typia.assert(adminLogin);

  // 3. Admin updates the report (reason, description, status)
  const updatePayload = {
    reason: RandomGenerator.pick([
      "abuse",
      "spam",
      "illegal content",
      "other",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.pick([
      "in_review",
      "resolved",
      "rejected",
    ] as const),
  } satisfies IDiscussionBoardReport.IUpdate;
  const updated =
    await api.functional.discussionBoard.admin.moderation.reports.update(
      connection,
      {
        reportId: createdReport.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);
  // Confirm only allowed fields change
  TestValidator.equals("report id stays same", updated.id, createdReport.id);
  TestValidator.notEquals(
    "updated_at is changed",
    updated.updated_at,
    createdReport.updated_at,
  );
  TestValidator.equals("reason updated", updated.reason, updatePayload.reason);
  TestValidator.equals(
    "description updated",
    updated.description,
    updatePayload.description,
  );
  TestValidator.equals("status updated", updated.status, updatePayload.status);
  TestValidator.equals(
    "target_type is immutable",
    updated.target_type,
    createdReport.target_type,
  );
  TestValidator.equals(
    "target_id is immutable",
    updated.target_id,
    createdReport.target_id,
  );
  TestValidator.equals(
    "created_at is immutable",
    updated.created_at,
    createdReport.created_at,
  );
  TestValidator.equals(
    "deleted_at is unchanged",
    updated.deleted_at,
    createdReport.deleted_at,
  );
  TestValidator.equals(
    "reporter_user_id is immutable",
    updated.reporter_user_id,
    createdReport.reporter_user_id,
  );

  // 4. Attempt illegal status transition (simulate business restriction)
  // For example, resolved -> open should not be valid (if the status transitioned to resolved above)
  if (updatePayload.status === "resolved") {
    await TestValidator.error(
      "should fail for invalid status regression (resolved -> open)",
      async () => {
        await api.functional.discussionBoard.admin.moderation.reports.update(
          connection,
          {
            reportId: createdReport.id,
            body: { status: "open" } satisfies IDiscussionBoardReport.IUpdate,
          },
        );
      },
    );
  }
}
