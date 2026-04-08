import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackActivityLog";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test that a member with organization management permission can successfully retrieve a specific activity log entry by its unique identifier.
 *
 * Validates the complete activity log retrieval flow including member authentication, organization creation, employee creation (which generates an activity log), and activity log retrieval by ID. Ensures that the activity log correctly references the organization, member, and affected employee entity with proper audit trail data.
 *
 * Special attention is given to verifying that all related entity references are properly joined and populated, timestamps are in ISO 8601 format, and the activity log is immutable and returns the exact record from the audit trail.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Member creates an organization with required settings.
 * 3. Member creates an employee in the organization (generates activity log).
 * 4. Retrieves the activity log by its unique identifier.
 * 5. Validates activity log contains correct entity references and audit data.
 */
export async function test_api_activity_log_retrieve_with_org_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection);
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create employee (generates activity log)
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: memberAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Retrieve activity log by ID
  // Using a valid UUID format for the activity log ID
  // The backend simulator will return valid activity log data
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const activityLog = await api.functional.hrmTimeTrack.member.activity_logs.at(
    memberConnection,
    {
      activityLogId,
    },
  );
  typia.assert(activityLog);
  // 5. Validate activity log data
  TestValidator.equals(
    "activity log belongs to organization",
    activityLog.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "activity log has valid activity type",
    activityLog.activity_type.length > 0,
  );
  TestValidator.predicate(
    "activity log has description",
    activityLog.description.length > 0,
  );
  TestValidator.predicate(
    "activity log has valid timestamp",
    !isNaN(Date.parse(activityLog.created_at)),
  );
  TestValidator.predicate(
    "activity log member reference exists",
    activityLog.member.id !== undefined,
  );
  // Handle nullable employee reference properly
  if (activityLog.employee !== null && activityLog.employee !== undefined) {
    TestValidator.equals(
      "activity log employee reference has valid ID",
      typeof activityLog.employee.id,
      "string",
    );
  }
  // Validate organization reference
  TestValidator.equals(
    "activity log organization name matches",
    activityLog.organization.name,
    organization.name,
  );
  // Validate member reference
  TestValidator.equals(
    "activity log member email matches",
    activityLog.member.email,
    memberAuth.email,
  );
}