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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrative_histories_retrieve_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Retrieve administrative history record
  const history =
    await api.functional.discussionBoard.superAdmin.administrative_histories.at(
      superAdminConnection,
      {
        historyId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(history);
  // Validate business logic - check that fields contain meaningful data
  TestValidator.predicate(
    "action type is not empty",
    history.action_type.length > 0,
  );
  TestValidator.predicate(
    "target type is not empty",
    history.target_type.length > 0,
  );
  TestValidator.predicate(
    "description is not empty",
    history.description.length > 0,
  );
  TestValidator.predicate(
    "administrator email is valid",
    history.administrator.email.includes("@"),
  );
  TestValidator.predicate(
    "admin grade is valid",
    ["regular", "super"].includes(history.administrator.admin_grade),
  );
  // Validate timestamp ordering
  TestValidator.predicate(
    "created at is before or equal to updated at",
    new Date(history.created_at) <= new Date(history.updated_at),
  );
  // Validate optional relations content when present
  if (history.adminRequest) {
    TestValidator.predicate(
      "admin request reason is not empty",
      history.adminRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "admin request status is valid",
      ["pending", "approved", "rejected"].includes(history.adminRequest.status),
    );
    TestValidator.predicate(
      "admin request member display name is not empty",
      history.adminRequest.member.display_name.length > 0,
    );
  }
  if (history.userBan) {
    TestValidator.predicate(
      "user ban reason is not empty",
      history.userBan.reason.length > 0,
    );
    TestValidator.predicate(
      "user ban status is valid",
      ["active", "expired", "removed"].includes(history.userBan.status),
    );
    TestValidator.predicate(
      "user ban member display name is not empty",
      history.userBan.member.display_name.length > 0,
    );
  }
  if (history.administratorAssignment) {
    TestValidator.predicate(
      "assignment old role is not empty",
      history.administratorAssignment.old_role.length > 0,
    );
    TestValidator.predicate(
      "assignment new role is not empty",
      history.administratorAssignment.new_role.length > 0,
    );
    TestValidator.predicate(
      "assignment type is not empty",
      history.administratorAssignment.assignment_type.length > 0,
    );
  }
  if (history.auditLog) {
    TestValidator.predicate(
      "audit log actor type is valid",
      ["admin", "super_admin"].includes(history.auditLog.actor_type),
    );
    TestValidator.predicate(
      "audit log target type is not empty",
      history.auditLog.target_type.length > 0,
    );
    TestValidator.predicate(
      "audit log action type is not empty",
      history.auditLog.action_type.length > 0,
    );
  }
}
