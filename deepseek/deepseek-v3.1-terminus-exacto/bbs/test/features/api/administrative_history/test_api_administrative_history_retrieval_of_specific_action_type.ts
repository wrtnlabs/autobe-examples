import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
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
import { generate_random_discussion_board_super_admin_administrator_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_administrator_assignments_create";
import { prepare_random_discussion_board_administrator_assignment } from "../../../prepare/prepare_random_discussion_board_administrator_assignment";

export async function test_api_administrative_history_retrieval_of_specific_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create administrator connection for role promotion
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create role promotion assignment
  const assignment =
    await generate_random_discussion_board_super_admin_administrator_assignments_create(
      superAdminConnection,
      {
        body: {
          old_role: "member",
          new_role: "admin",
          assignment_type: "promotion",
          reason: "Promotion test for administrative history",
        } satisfies IDiscussionBoardAdministratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);
  // Search for administrative histories with role promotion action type
  const searchResult =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          action_type: "role_promotion",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(searchResult);
  // Find the promotion history record
  const promotionHistory = searchResult.data.find(
    (history) => history.action_type === "role_promotion",
  );
  TestValidator.predicate(
    "should find promotion history",
    promotionHistory !== undefined,
  );
  if (!promotionHistory) {
    throw new Error("No promotion history record found");
  }
  // Retrieve the specific administrative history record
  const detailedHistory =
    await api.functional.discussionBoard.admin.administrative_histories.at(
      superAdminConnection,
      {
        historyId: promotionHistory.id,
      },
    );
  typia.assert(detailedHistory);
  // Validations
  TestValidator.equals(
    "action type should be role_promotion",
    detailedHistory.action_type,
    "role_promotion",
  );
  TestValidator.predicate(
    "should have administrator assignment",
    detailedHistory.administratorAssignment !== undefined,
  );
  if (detailedHistory.administratorAssignment) {
    TestValidator.equals(
      "old role should be member",
      detailedHistory.administratorAssignment.old_role,
      "member",
    );
    TestValidator.equals(
      "new role should be admin",
      detailedHistory.administratorAssignment.new_role,
      "admin",
    );
    TestValidator.equals(
      "assignment type should be promotion",
      detailedHistory.administratorAssignment.assignment_type,
      "promotion",
    );
  }
  TestValidator.predicate(
    "should have administrator details",
    detailedHistory.administrator !== undefined,
  );
  if (detailedHistory.administrator) {
    TestValidator.predicate(
      "administrator should have admin_grade",
      detailedHistory.administrator.admin_grade === "regular" ||
        detailedHistory.administrator.admin_grade === "super",
    );
  }
  TestValidator.predicate(
    "description should be present",
    detailedHistory.description.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp should be valid",
    new Date(detailedHistory.created_at).getTime() > 0,
  );
  // Timeline validation - administrative history should be created after the assignment
  if (detailedHistory.administratorAssignment) {
    const historyDate = new Date(detailedHistory.created_at);
    const assignmentDate = new Date(
      detailedHistory.administratorAssignment.created_at,
    );
    TestValidator.predicate(
      "history should be created after assignment",
      historyDate >= assignmentDate,
    );
  }
  // Audit log validation
  if (detailedHistory.auditLog) {
    TestValidator.predicate(
      "audit log should have action_type",
      detailedHistory.auditLog.action_type.length > 0,
    );
  }
}
