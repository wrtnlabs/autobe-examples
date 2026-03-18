import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_activity_log_retrieve_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member to obtain authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create a new organization (becomes owner with full permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project to generate an activity log entry
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Retrieve the activity log list to find the generated log ID
  const activityLogList =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(activityLogList);
  // Verify we have at least one activity log (from project creation)
  TestValidator.predicate(
    "activity log list should have at least one entry",
    activityLogList.data.length > 0,
  );
  // Get the first activity log (should be the project creation)
  const activityLogSummary = activityLogList.data[0];
  typia.assert(activityLogSummary);
  // 5. Call the target endpoint to retrieve full activity log details
  const activityLog =
    await api.functional.erpHrm.member.organizations.activity_logs.at(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: activityLogSummary.id,
      },
    );
  typia.assert(activityLog);
  // Validate the activity log structure and data
  TestValidator.equals(
    "activity log organization ID matches",
    activityLog.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "activity log organization name matches",
    activityLog.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "activity log organization currency matches",
    activityLog.organization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "activity log organization timezone matches",
    activityLog.organization.timezone,
    organization.timezone,
  );
  // Validate actor member matches the authorized member
  TestValidator.predicate(
    "activity log has actor member",
    activityLog.actorMember !== null,
  );
  if (activityLog.actorMember !== null) {
    TestValidator.equals(
      "actor member user ID matches authorized member",
      activityLog.actorMember.user.id,
      authorizedMember.id,
    );
    TestValidator.equals(
      "actor member user email matches authorized member",
      activityLog.actorMember.user.email,
      authorizedMember.email,
    );
    TestValidator.equals(
      "actor member user first name matches authorized member",
      activityLog.actorMember.user.firstName,
      authorizedMember.firstName,
    );
    TestValidator.equals(
      "actor member user last name matches authorized member",
      activityLog.actorMember.user.lastName,
      authorizedMember.lastName,
    );
  }
  // Validate details array exists
  TestValidator.predicate(
    "activity log details array exists",
    Array.isArray(activityLog.details),
  );
}
