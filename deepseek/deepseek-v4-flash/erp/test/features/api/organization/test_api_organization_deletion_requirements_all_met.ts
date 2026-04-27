import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_deletion_requirements_all_met(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the member who will own the organization
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member (organization owner)
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization — the authenticated member becomes the owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Check deletion requirements as the organization owner
  const requirements =
    await api.functional.hrmTimeTracking.member.organizations.deletion_requirements.at(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(requirements);
  // 4. Verify all requirements are met — a fresh organization has no
  //    employees, no pending timesheets, and no active contracts
  TestValidator.equals(
    "all requirements met",
    requirements.allRequirementsMet,
    true,
  );
  TestValidator.equals(
    "pending timesheets resolved",
    requirements.pendingTimesheetsResolved,
    true,
  );
  TestValidator.equals(
    "pending timesheet count",
    requirements.pendingTimesheetCount,
    0,
  );
  TestValidator.equals(
    "no active contracts",
    requirements.noActiveContracts,
    true,
  );
  TestValidator.equals(
    "active contract count",
    requirements.activeContractCount,
    0,
  );
}
