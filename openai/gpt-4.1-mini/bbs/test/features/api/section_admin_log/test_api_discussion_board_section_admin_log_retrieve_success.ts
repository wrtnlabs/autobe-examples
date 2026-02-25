import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test retrieval of a valid section administration log by ID as an authenticated superAdministrator user.
 * Confirm the response returns expected detailed log fields including actionType, note, timestamps,
 * and nested administrator and section summaries. Validate 200 success and proper data properties.
 */
export async function test_api_discussion_board_section_admin_log_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator user by joining.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(superAdmin);
  // 2. Use the authenticated connection to retrieve a SectionAdminLog by a known valid ID.
  // Since no creation endpoint exists, we use the ID from the joined admin's ID for demonstration,
  // assuming a log entry exists with this or similar ID. Replace with a real fixture ID in production.
  const knownValidId = superAdmin.id; // Note: In real test, we would create or query from DB
  const retrievedLog =
    await api.functional.discussionBoard.superAdministrator.sectionAdminLogs.at(
      superAdminConnection,
      { id: knownValidId },
    );
  // 3. Assert the returned object fully conforms to IDiscussionBoardSectionAdminLog
  typia.assert(retrievedLog);
  // 4. Check important business logic related properties
  TestValidator.predicate(
    "actionType is non-empty string",
    typeof retrievedLog.actionType === "string" &&
      retrievedLog.actionType.length > 0,
  );
  TestValidator.predicate(
    "note is string or null",
    retrievedLog.note === null || typeof retrievedLog.note === "string",
  );
  TestValidator.predicate(
    "timestamps createdAt and updatedAt are non-empty strings",
    typeof retrievedLog.createdAt === "string" &&
      retrievedLog.createdAt.length > 0 &&
      typeof retrievedLog.updatedAt === "string" &&
      retrievedLog.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is string or null",
    retrievedLog.deletedAt === null ||
      typeof retrievedLog.deletedAt === "string",
  );
  // 5. Check nested administrator summary
  TestValidator.predicate(
    "administrator.id is non-empty string",
    typeof retrievedLog.administrator.id === "string" &&
      retrievedLog.administrator.id.length > 0,
  );
  TestValidator.predicate(
    "administrator.email is non-empty string",
    typeof retrievedLog.administrator.email === "string" &&
      retrievedLog.administrator.email.length > 0,
  );
  // 6. Check nested section summary
  // As IDiscussionBoardSection.ISummary had no specified fields, we just assert the object exists
  TestValidator.predicate(
    "section object exists",
    retrievedLog.section !== null && typeof retrievedLog.section === "object",
  );
}
