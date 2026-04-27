import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import type { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

/**
 * Test paginated listing of activity log entries after performing organizational actions.
 *
 * Registers a new member, creates an organization (making the member the owner with org:manage permission), then creates a project and a department to generate activity log entries. Verifies that the paginated activity log response contains the expected entries with proper structure and ordering.
 *
 * 1. Register a new member via {@link authorize_member_join}.
 * 2. Create an organization — the member becomes owner with org:manage permission required for accessing activity logs.
 * 3. Create a project within the organization to generate a "project.created" activity log entry.
 * 4. Create a department within the organization to generate a "department-created" activity log entry.
 * 5. Call PATCH /member/activity-logs with default pagination (no filters).
 * 6. Validate that the response contains pagination metadata (current, limit, records, pages) and a data array.
 * 7. Validate each entry has id, createdAt, actor (displayName, email), activityLogType (code, name), targetEntityType, targetEntityId, targetEntityName fields.
 * 8. Verify that the project creation and department creation entries appear in the logs.
 */
export async function test_api_activity_log_paginated_listing_with_org_actions(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Register member ----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // ---- Step 2: Create organization ----
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // ---- Step 3: Create project (generates "project.created" activity log) ----
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // ---- Step 4: Create department (generates "department-created" activity log) ----
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // ---- Step 5: Retrieve activity logs with default pagination ----
  const response =
    await api.functional.hrmTimeTracking.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingActivityLog.IRequest,
      },
    );
  typia.assert(response);
  // ---- Step 6: Validate pagination metadata ----
  TestValidator.equals(
    "pagination has current",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has at least two activity log entries",
    () => response.pagination.records >= 2,
  );
  // ---- Step 7: Verify that the project creation and department creation entries appear ----
  const projectCreatedEntry = response.data.find(
    (e) =>
      e.activityLogType.code === "project.created" &&
      e.targetEntityName === project.name,
  );
  TestValidator.predicate(
    "project created log entry found",
    () => projectCreatedEntry !== undefined,
  );
  const departmentCreatedEntry = response.data.find(
    (e) =>
      e.activityLogType.code === "department-created" &&
      e.targetEntityName === department.name,
  );
  TestValidator.predicate(
    "department created log entry found",
    () => departmentCreatedEntry !== undefined,
  );
}
