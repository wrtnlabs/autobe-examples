import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
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
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

/**
 * Test that retrieving a non-existent department snapshot returns 404.
 *
 * Validates that the system properly rejects requests for snapshot records that do not exist within a valid department. The department must exist for the snapshot lookup to be scoped correctly, ensuring the 404 is specifically about the snapshot, not the department.
 *
 * 1. Register a new member account via `authorize_member_join`.
 * 2. Create a department via `generate_random_hrm_time_tracking_member_departments_create`.
 * 3. Attempt to retrieve a snapshot with a random UUID that does not correspond to any existing snapshot.
 * 4. Validate that the request fails with a 404 HTTP error, confirming the snapshot was not found.
 */
export async function test_api_department_snapshot_non_existent_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a department
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // 3. Try to get a non-existent snapshot - should return 404
  await TestValidator.httpError("non-existent snapshot", 404, async () => {
    await api.functional.hrmTimeTracking.member.departments.snapshots.at(
      memberConnection,
      {
        departmentId: department.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
