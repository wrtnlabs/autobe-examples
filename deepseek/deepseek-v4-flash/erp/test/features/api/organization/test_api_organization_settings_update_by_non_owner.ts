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
 * Test that a non-owner member cannot update organization settings.
 *
 * Validates that only the organization owner can update organization settings by creating an organization as Member A and then attempting to update it as Member B (a different registered member). The update request must be rejected with a 403 Forbidden status code, confirming that ownership-based authorization is correctly enforced.
 *
 * 1. Register Member A via the member join utility.
 * 2. Member A creates a new organization via the organization creation utility.
 * 3. Register Member B (different member) via the member join utility.
 * 4. Member B attempts to update Member A's organization settings.
 * 5. Validates that the server returns HTTP 403 Forbidden.
 */
export async function test_api_organization_settings_update_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (organization owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register Member B (non-owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B attempts to update Member A's organization settings
  //    Should be rejected with 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot update organization settings",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.update(
        memberBConnection,
        {
          organizationId: organization.id,
          body: {
            name: "Hacked Organization Name",
          } satisfies IHrmTimeTrackingOrganization.IUpdate,
        },
      );
    },
  );
}
