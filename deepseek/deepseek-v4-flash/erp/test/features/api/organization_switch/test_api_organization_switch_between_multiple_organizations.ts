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

/**
 * Test organization context switching between multiple organizations for an authenticated member.
 *
 * Validates that a member who owns two organizations can switch their active organization context without logging out. The switch endpoint returns the full organization record, and subsequent switches correctly reflect the new organization's data.
 *
 * Special attention is given to verifying that the organization's identifier, display name, and description are accurately returned after each switch, confirming that the server correctly updates the session context.
 *
 * 1. Register a new member account and authenticate to obtain JWT tokens.
 * 2. Create the first organization "Acme Corp" via the member organizations endpoint.
 * 3. Create the second organization "Startup Inc" via the same endpoint.
 * 4. Switch to the first organization by calling the switch endpoint with org1's UUID.
 * 5. Validate the response contains org1's id, name, description, and active status.
 * 6. Switch to the second organization by calling the switch endpoint with org2's UUID.
 * 7. Validate the response contains org2's id, name, and description, confirming the context switch was successful.
 */
export async function test_api_organization_switch_between_multiple_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (utility function updates connection headers)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create first organization "Acme Corp"
  const org1 =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Acme Corp",
          description: "First test organization for switch testing",
        },
      },
    );
  typia.assert(org1);
  TestValidator.equals("org1 status is active", org1.status, "active");
  // 3. Create second organization "Startup Inc"
  const org2 =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Startup Inc",
          description: "Second test organization for switch testing",
        },
      },
    );
  typia.assert(org2);
  TestValidator.equals("org2 status is active", org2.status, "active");
  // 4. Switch to the first organization
  const switchedToOrg1 =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      {
        organizationId: org1.id,
      },
    );
  typia.assert(switchedToOrg1);
  TestValidator.equals("switched to org1 id", switchedToOrg1.id, org1.id);
  TestValidator.equals("switched to org1 name", switchedToOrg1.name, org1.name);
  TestValidator.equals(
    "switched to org1 description",
    switchedToOrg1.description,
    org1.description,
  );
  // 5. Switch to the second organization
  const switchedToOrg2 =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      {
        organizationId: org2.id,
      },
    );
  typia.assert(switchedToOrg2);
  TestValidator.equals("switched to org2 id", switchedToOrg2.id, org2.id);
  TestValidator.equals("switched to org2 name", switchedToOrg2.name, org2.name);
  TestValidator.equals(
    "switched to org2 description",
    switchedToOrg2.description,
    org2.description,
  );
}
