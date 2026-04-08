import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
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
 * Test the primary success path for organization switching.
 *
 * Validates the complete organization switch workflow including member registration, organization creation, employee record setup, and context switching. Ensures that the switch operation correctly updates the session context and returns complete organization details.
 *
 * Special attention is given to verifying that the member has an active employee record in the target organization and that the switch response contains all required organization fields.
 *
 * 1. Register and authenticate a member to establish initial session.
 * 2. Create a second organization for the member to switch to.
 * 3. Create an employee record linking the member to the second organization with active status.
 * 4. Call the switch endpoint with the second organization's ID.
 * 5. Validate the response contains complete IHrmTimeTrackOrganization with all fields.
 * 6. Verify the organization details match the created organization.
 */
export async function test_api_organization_switch_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection);
  typia.assert(authResponse);
  // 2. Create first organization (initial context)
  const firstOrganizationBody = {
    name: RandomGenerator.name(),
    currency: "USD" as const,
    timezone: "Asia/Seoul" as const,
    fiscal_start_month: 1 as const,
  } satisfies IHrmTimeTrackOrganization.ICreate;
  const firstOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: firstOrganizationBody },
    );
  typia.assert(firstOrganization);
  // 3. Create second organization for switching
  const secondOrganizationBody = {
    name: RandomGenerator.name(),
    currency: "USD" as const,
    timezone: "Asia/Seoul" as const,
    fiscal_start_month: 1 as const,
  } satisfies IHrmTimeTrackOrganization.ICreate;
  const secondOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: secondOrganizationBody },
    );
  typia.assert(secondOrganization);
  // 4. Create employee record linking member to second organization
  const employeeBody = {
    position: RandomGenerator.name(),
    employment_type: "full-time" as const,
    hire_date: new Date().toISOString(),
    status: "active" as const,
    hrm_time_track_member_id: authResponse.id,
  } satisfies IHrmTimeTrackEmployee.ICreate;
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    { body: employeeBody },
  );
  typia.assert(employee);
  // 5. Switch to second organization
  const switchedOrganization =
    await api.functional.hrmTimeTrack.member.organizations._switch.switchContext(
      memberConnection,
      {
        organizationId: secondOrganization.id,
      },
    );
  typia.assert(switchedOrganization);
  // 6. Validate response contains complete organization details
  TestValidator.equals(
    "switched organization ID matches target",
    switchedOrganization.id,
    secondOrganization.id,
  );
  TestValidator.equals(
    "switched organization name matches",
    switchedOrganization.name,
    secondOrganization.name,
  );
  TestValidator.equals(
    "switched organization currency matches",
    switchedOrganization.currency,
    secondOrganization.currency,
  );
  TestValidator.equals(
    "switched organization timezone matches",
    switchedOrganization.timezone,
    secondOrganization.timezone,
  );
  TestValidator.equals(
    "switched organization fiscal_start_month matches",
    switchedOrganization.fiscal_start_month,
    secondOrganization.fiscal_start_month,
  );
  TestValidator.predicate(
    "switched organization has valid created_at",
    switchedOrganization.created_at !== null &&
      switchedOrganization.created_at !== undefined,
  );
  TestValidator.predicate(
    "switched organization has valid updated_at",
    switchedOrganization.updated_at !== null &&
      switchedOrganization.updated_at !== undefined,
  );
  TestValidator.predicate(
    "switched organization is not deleted",
    switchedOrganization.deleted_at === null,
  );
}