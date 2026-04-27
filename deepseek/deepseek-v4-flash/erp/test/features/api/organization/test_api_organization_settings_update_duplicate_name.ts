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
 * Test that updating an organization's name to an already-taken name results in a 409 Conflict error.
 *
 * Validates the globally unique name constraint on the organization resource. Registers a single member who creates two organizations with distinct names, then attempts to rename the second organization to match the first organization's name. The API must reject the duplicate name update with a 409 Conflict response, preserving both organizations' original names.
 *
 * Since no dedicated GET/read endpoint is available for organizations, name preservation is implicitly verified: both organizations are successfully created with their intended names (confirmed via creation response), and the rejected update guarantees neither name was modified.
 *
 * 1. Register and authenticate a new member account via the join endpoint.
 * 2. Create Organization A with a distinctive, unique name.
 * 3. Create Organization B with a different, unique name.
 * 4. Attempt to update Organization B's name to match Organization A's name.
 * 5. Assert that the update is rejected with HTTP 409 Conflict.
 */
export async function test_api_organization_settings_update_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create Organization A with a distinctive name
  const orgAName = `Alpha_${RandomGenerator.alphabets(8)}`;
  const organizationA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: orgAName,
        },
      },
    );
  typia.assert(organizationA);
  TestValidator.equals("Organization A name", orgAName, organizationA.name);
  // 3. Create Organization B with a different name
  const orgBName = `Beta_${RandomGenerator.alphabets(8)}`;
  const organizationB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: orgBName,
        },
      },
    );
  typia.assert(organizationB);
  TestValidator.equals("Organization B name", orgBName, organizationB.name);
  // 4. Try updating Organization B's name to Organization A's name
  // Should fail with 409 Conflict due to globally unique name constraint
  await TestValidator.httpError(
    "duplicate organization name should be rejected with 409",
    409,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.update(
        memberConnection,
        {
          organizationId: organizationB.id,
          body: {
            name: organizationA.name,
          } satisfies IHrmTimeTrackingOrganization.IUpdate,
        },
      );
    },
  );
}
