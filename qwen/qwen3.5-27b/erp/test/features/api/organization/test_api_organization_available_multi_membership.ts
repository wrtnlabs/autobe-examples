import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganization";
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
 * Test that an authenticated member who belongs to multiple organizations can retrieve all available organizations with their respective role and status information.
 *
 * Validates the multi-organization membership workflow by registering a member, creating two organizations, adding the member as an employee to both organizations with different roles, and verifying that the available organizations endpoint returns both organizations with correct data.
 *
 * Special attention is given to ensuring that the member can access organizations they belong to and that the response includes proper pagination information.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create first organization with random configuration.
 * 3. Create second organization with random configuration.
 * 4. Add member as employee to first organization.
 * 5. Add member as employee to second organization.
 * 6. Call available organizations endpoint.
 * 7. Validate response contains both organizations with correct pagination.
 */
export async function test_api_organization_available_multi_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create first organization
  const org1: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(org1);
  // 3. Create second organization
  const org2: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "EUR",
          timezone: "Europe/London",
          fiscal_start_month: 4,
        },
      },
    );
  typia.assert(org2);
  // 4. Add member as employee to first organization
  const employee1: IHrmTimeTrackEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: "Owner",
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(employee1);
  // 5. Add member as employee to second organization
  const employee2: IHrmTimeTrackEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          position: "Employee",
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(employee2);
  // 6. Call available organizations endpoint
  const available: IPageIHrmTimeTrackOrganization.ISummary =
    await api.functional.hrmTimeTrack.member.organizations.available(
      memberConnection,
    );
  typia.assert(available);
  // 7. Validate response
  TestValidator.equals("pagination current", available.pagination.current, 1);
  TestValidator.equals("pagination limit", available.pagination.limit, 10);
  TestValidator.equals("pagination records", available.pagination.records, 2);
  TestValidator.equals("pagination pages", available.pagination.pages, 1);
  TestValidator.equals("data count", available.data.length, 2);
  // Verify both organizations are present
  const orgIds = available.data.map((org) => org.id);
  TestValidator.predicate("org1 present", orgIds.includes(org1.id));
  TestValidator.predicate("org2 present", orgIds.includes(org2.id));
}
