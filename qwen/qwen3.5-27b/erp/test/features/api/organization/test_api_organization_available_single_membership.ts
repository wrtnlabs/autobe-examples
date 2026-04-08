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
 * Test that an authenticated member who belongs to only one organization retrieves that single organization correctly.
 *
 * Validates the available organizations endpoint for a member with single organization membership. Ensures that the pagination metadata correctly reflects a single record and that the organization summary contains all expected fields.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a single organization with the authenticated member.
 * 3. Add the member as an employee to that organization.
 * 4. Call the available organizations endpoint.
 * 5. Validate pagination shows records = 1 and pages = 1.
 * 6. Validate the data array contains exactly one organization summary.
 * 7. Validate the returned organization matches the created organization.
 */
export async function test_api_organization_available_single_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
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
  // 3. Add member as employee to the organization using utility function
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: memberAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Call available organizations endpoint
  const available =
    await api.functional.hrmTimeTrack.member.organizations.available(
      memberConnection,
    );
  typia.assert(available);
  // 5. Validate pagination
  TestValidator.equals("pagination records", available.pagination.records, 1);
  TestValidator.equals("pagination pages", available.pagination.pages, 1);
  // 6. Validate data array length
  TestValidator.equals("data array length", available.data.length, 1);
  // 7. Validate organization match
  TestValidator.equals(
    "organization id matches",
    available.data[0].id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    available.data[0].name,
    organization.name,
  );
  TestValidator.equals(
    "organization currency matches",
    available.data[0].currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    available.data[0].timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month matches",
    available.data[0].fiscal_start_month,
    organization.fiscal_start_month,
  );
}