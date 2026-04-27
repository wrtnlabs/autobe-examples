import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
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
 * Test that requesting a non-existent employee snapshot returns a 404 Not Found error.
 *
 * Validates the business rule that attempting to retrieve an employee snapshot that does not exist in the system results in an HTTP 404 error response. Ensures the system correctly distinguishes between found and not-found scenarios for snapshot records.
 *
 * The test creates a valid authenticated member context with an organization and then attempts to retrieve a snapshot with a randomly generated UUID that does not correspond to any existing snapshot record. The 404 response confirms the system's error handling for missing snapshot resources.
 *
 * 1. Register a new member account via `authorize_member_join`.
 * 2. Create a new organization owned by the member via `generate_random_hrm_time_tracking_member_organizations_create`.
 * 3. Switch the active organization context to the newly created organization via the SDK.
 * 4. Attempt to retrieve a snapshot with a non-existent UUID.
 * 5. Validate that the API returns a 404 HTTP status.
 */
export async function test_api_employee_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the organization context
  const switched =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switched);
  // 4. Generate a non-existent snapshot UUID
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve a non-existent snapshot and expect 404
  await TestValidator.httpError("snapshot not found", 404, async () => {
    await api.functional.hrmTimeTracking.employees.snapshots.at(
      memberConnection,
      {
        employeeId: organization.id,
        snapshotId: fakeSnapshotId,
      },
    );
  });
}
