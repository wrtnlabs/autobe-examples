import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_create";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_administrator_audit_grade_change_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.login(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdmin);
  // Setup regular administrator for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.login(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.ILogin,
    },
  );
  typia.assert(admin);
  // Create administrator assignment which should generate grade change record
  const assignment =
    await api.functional.discussionBoard.superAdmin.administrators.create(
      superAdminConnection,
      {
        body: {
          permission_level: "regular",
          admin_id: admin.id,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment);
  // Search for any existing grade change records
  const searchRequest: IDiscussionBoardAdministratorGradeChange.IRequest = {
    administrator_id: admin.id,
    page: 1,
    limit: 10,
  };
  const searchResults =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResults);
  // Verify at least one grade change record exists
  TestValidator.predicate(
    "should have grade change records",
    searchResults.data.length > 0,
  );
  const gradeChangeRecord = searchResults.data[0];
  // Verify the record exists and is accessible
  TestValidator.equals(
    "grade change record should have valid ID",
    typeof gradeChangeRecord.id,
    "string",
  );
  TestValidator.predicate(
    "administrator should match",
    gradeChangeRecord.administrator.id === admin.id,
  );
  // Delete the grade change record
  await api.functional.discussionBoard.superAdmin.administrator_grade_changes.erase(
    superAdminConnection,
    { changeId: gradeChangeRecord.id },
  );
  // Verify deletion by searching again - record should not exist
  const searchAfterDelete =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      { body: searchRequest },
    );
  typia.assert(searchAfterDelete);
  // Validate the record was permanently removed
  const deletedRecordFound = searchAfterDelete.data.some(
    (record) => record.id === gradeChangeRecord.id,
  );
  TestValidator.predicate(
    "deleted record should not be found",
    !deletedRecordFound,
  );
  // Additional validation for audit trail completeness
  TestValidator.predicate(
    "remaining records should be valid",
    searchAfterDelete.data.every((record) => record.id && record.administrator),
  );
}
