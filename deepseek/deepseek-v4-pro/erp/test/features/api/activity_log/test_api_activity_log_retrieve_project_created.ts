
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test retrieval of a single activity log entry for project creation events.
 *
 * Validates the complete workflow from triggering an automatic activity log
 * entry through project creation, discovering the entry via filtered listing,
 * and retrieving the full detail with all audit trail fields.
 *
 * The test verifies that project creation automatically generates a
 * `project_created` activity log entry with correct polymorphic target
 * reference, null details (project creation has no contextual payload),
 * valid timestamps, proper organization scoping, and accurate user attribution
 * combining global profile with organization-specific employment details.
 *
 * 1. Member registers and authenticates as organization Owner.
 * 2. Member creates a project, triggering `project_created` log generation.
 * 3. Activity logs are listed with `project_created` action type filter.
 * 4. The entry matching the created project's UUID is identified.
 * 5. The single entry is retrieved by its discovered UUID.
 * 6. All fields are validated: id, action_type, target_entity, target_id,
 *    details, organization_id, created_at, and the resolved user summary
 *    including both global profile and organization-specific employment data.
 */
export async function test_api_activity_log_retrieve_project_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member (Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project to trigger automatic project_created activity log
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. List activity logs filtered by project_created action type
  const logPage = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        action_type: "project_created",
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(logPage);
  TestValidator.predicate(
    "at least one project_created activity log exists",
    logPage.data.length > 0,
  );
  // Find the log entry matching the created project's UUID
  const matchedLog = logPage.data.find(
    (entry) => entry.target_id === project.id,
  );
  TestValidator.predicate(
    "activity log for the created project is found",
    matchedLog !== undefined,
  );
  typia.assertGuard(matchedLog!);
  // 4. Retrieve the full single activity log entry
  const activityLog = await api.functional.erpHrm.member.activity_logs.at(
    memberConnection,
    {
      activityLogId: matchedLog.id,
    },
  );
  typia.assert(activityLog);
  // 5. Validate all required fields
  TestValidator.equals(
    "id matches the discovered entry",
    activityLog.id,
    matchedLog.id,
  );
  TestValidator.equals(
    "action_type is project_created",
    activityLog.action_type,
    "project_created",
  );
  TestValidator.equals(
    "target_entity is project",
    activityLog.target_entity,
    "project",
  );
  TestValidator.equals(
    "target_id matches the created project UUID",
    activityLog.target_id,
    project.id,
  );
  TestValidator.equals(
    "details is null (project creation has no contextual payload)",
    activityLog.details,
    null,
  );
  TestValidator.equals(
    "organization_id matches the project's organization",
    activityLog.organization_id,
    project.organization_id,
  );
  // Validate user object matches the authenticated member
  TestValidator.equals(
    "user.id matches the authenticated member",
    activityLog.user.id,
    member.id,
  );
  TestValidator.equals(
    "user.email matches the authenticated member",
    activityLog.user.email,
    member.email,
  );
  TestValidator.equals(
    "user.display_name matches the authenticated member",
    activityLog.user.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "user.avatar_image matches the authenticated member",
    activityLog.user.avatar_image,
    member.avatar_image,
  );
  TestValidator.equals(
    "user.phone_number matches the authenticated member",
    activityLog.user.phone_number,
    member.phone_number,
  );
  // Validate organization-specific employment details exist on the user
  TestValidator.predicate(
    "user.employee_id is present",
    activityLog.user.employee_id.length > 0,
  );
  TestValidator.predicate(
    "user.position is present",
    activityLog.user.position.length > 0,
  );
  TestValidator.predicate(
    "user.employment_type is present",
    activityLog.user.employment_type.length > 0,
  );
  TestValidator.predicate(
    "user.status is present",
    activityLog.user.status.length > 0,
  );
  TestValidator.predicate(
    "user.role_name is present",
    activityLog.user.role_name.length > 0,
  );
}
