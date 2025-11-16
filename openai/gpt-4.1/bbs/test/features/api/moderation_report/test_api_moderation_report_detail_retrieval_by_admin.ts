import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that an authenticated admin can retrieve the full detail of a
 * moderation report for review.
 *
 * This test performs these steps:
 *
 * 1. Registers a new admin and authenticates for a valid session.
 * 2. Creates a random moderation report entity in a way that would exist in the
 *    system (simulated, since creation API is not provided).
 * 3. Retrieves the report using the admin session and the reportId.
 * 4. Asserts all report properties (id, target_type, target_id, reason,
 *    description, status, reporter_user_id, created_at, updated_at, deleted_at)
 *    are present and correct.
 */
export async function test_api_moderation_report_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const joinAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A!1b", // meet strong requirements
    href: "https://admin-join.test/",
    referrer: "https://referrer.test/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinAdminBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    joinAdminBody.email,
  );
  TestValidator.predicate("admin is active", admin.is_active === true);
  TestValidator.predicate("admin is not blocked", admin.is_blocked === false);

  // 2. Simulate existence of a moderation report (since there is no creation API, use typia.random)
  const report: IDiscussionBoardReport = typia.random<IDiscussionBoardReport>();

  // 3. Retrieve the moderation report details as admin
  // (simulate that this report exists in the database; in a real test, would create and retrieve the same one)
  const fetched: IDiscussionBoardReport =
    await api.functional.discussionBoard.admin.moderation.reports.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(fetched);

  // 4. Assert all report fields are correct type and present
  TestValidator.equals("report id matches", fetched.id, report.id);
  TestValidator.equals(
    "target_type matches",
    fetched.target_type,
    report.target_type,
  );
  TestValidator.equals(
    "target_id matches",
    fetched.target_id,
    report.target_id,
  );
  TestValidator.equals("reason matches", fetched.reason, report.reason);
  TestValidator.equals("status matches", fetched.status, report.status);
  TestValidator.equals(
    "reporter_user_id matches",
    fetched.reporter_user_id,
    report.reporter_user_id,
  );
  TestValidator.equals(
    "created_at matches",
    fetched.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    fetched.updated_at,
    report.updated_at,
  );
  TestValidator.equals(
    "description matches",
    fetched.description,
    report.description,
  );
  TestValidator.equals(
    "deleted_at matches",
    fetched.deleted_at,
    report.deleted_at,
  );
}
