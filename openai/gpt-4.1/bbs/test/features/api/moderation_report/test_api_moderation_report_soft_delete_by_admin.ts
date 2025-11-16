import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * E2E test for the soft-deletion of a moderation report by an authenticated
 * admin.
 *
 * Validates business rules, authentication logic, and soft-delete mechanics for
 * moderation reports.
 *
 * Steps:
 *
 * 1. Register as an admin (join - obtain session and JWT)
 * 2. Fabricate a mockup moderation report object (simulate existing, since there
 *    is no report creation API provided)
 * 3. As admin, execute the moderation report erase API (soft delete)
 * 4. Assert that the deleted_at field is correctly set (soft delete, not hard
 *    delete)
 * 5. Assert that essential audit fields (id, target_type, created_at, etc.) are
 *    preserved
 * 6. Attempt the erase API without authentication and expect error
 */
export async function test_api_moderation_report_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://moderation.example.com/register",
    referrer: "https://moderation.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Mock/fake a moderation report (simulate, as there's no API to create one)
  const initialReport: IDiscussionBoardReport =
    typia.random<IDiscussionBoardReport>();
  typia.assert(initialReport);

  // 3. As admin, perform the erase (soft-delete) API call
  const deletedReport =
    await api.functional.discussionBoard.admin.moderation.reports.erase(
      connection,
      { reportId: initialReport.id },
    );
  typia.assert(deletedReport);

  // 4. Assert deleted_at is set (soft delete) and report is unchanged for audit fields
  TestValidator.predicate(
    "deleted_at must be a non-null ISO string",
    typeof deletedReport.deleted_at === "string" &&
      deletedReport.deleted_at.length > 0,
  );
  TestValidator.equals(
    "moderation report id must not change after deletion",
    deletedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "target_type and target_id must remain after deletion",
    deletedReport.target_type,
    initialReport.target_type,
  );
  TestValidator.equals(
    "created_at is unchanged for audit history",
    deletedReport.created_at,
    initialReport.created_at,
  );

  // 5. Attempt to delete as unauthenticated (empty headers, unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot perform erase",
    async () => {
      await api.functional.discussionBoard.admin.moderation.reports.erase(
        unauthConn,
        { reportId: initialReport.id },
      );
    },
  );
}
