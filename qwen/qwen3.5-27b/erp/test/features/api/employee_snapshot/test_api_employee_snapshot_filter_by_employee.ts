import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployeeSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";

/**
 * Test filtering employee snapshots by specific employee ID to track an employee's state changes over time.
 *
 * Validates the employee snapshot filtering functionality by creating an employee record and querying snapshots filtered by that employee's ID. Ensures that only snapshots for the specified employee are returned, sorted by creation time in descending order. Verifies that snapshots capture the complete state of the employee including position, employment type, status, department, and role assignments.
 *
 * Special attention is given to verifying that the employee_id filter parameter correctly isolates snapshots to a single employee, and that the returned snapshots contain accurate historical data reflecting the employee's state at the time each snapshot was created.
 *
 * 1. Member authenticates via join endpoint to obtain access token.
 * 2. Member creates an employee record with position, employment type, and hire date.
 * 3. Member queries employee snapshots filtered by the created employee's ID.
 * 4. Validates that returned snapshots belong only to the specified employee.
 * 5. Confirms snapshots are sorted by created_at in descending order (most recent first).
 * 6. Verifies snapshot data includes organization, member, department, and role references.
 * 7. Validates pagination metadata is correctly populated.
 */
export async function test_api_employee_snapshot_filter_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create an employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Query snapshots filtered by employee ID
  const snapshots =
    await api.functional.hrmTimeTrack.member.employee_snapshots.index(
      memberConnection,
      {
        body: {
          employee_id: employee.id,
          limit: 20,
          page: 1,
          sort_field: "created_at",
          sort_direction: "desc",
        } satisfies IHrmTimeTrackEmployeeSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate that at least one snapshot exists for the newly created employee
  TestValidator.predicate(
    "at least one snapshot exists for the employee",
    snapshots.data.length > 0,
  );
  // 5. Validate that all returned snapshots belong to the specified employee
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    // Each snapshot should have the same member as the employee
    TestValidator.equals(
      "snapshot member matches employee member",
      snapshot.member.id,
      employee.member.id,
    );
    // Each snapshot should have the same organization as the employee
    TestValidator.equals(
      "snapshot organization matches employee organization",
      snapshot.organization.id,
      employee.organization.id,
    );
    // Snapshot should have valid employment type
    TestValidator.predicate(
      "snapshot has valid employment type",
      ["full-time", "part-time", "contractor", "intern"].includes(
        snapshot.employment_type,
      ),
    );
    // Snapshot should have valid status
    TestValidator.predicate(
      "snapshot has valid status",
      ["active", "deactivated"].includes(snapshot.status),
    );
  });
  // 6. Validate that the most recent snapshot matches the employee's current state
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "latest snapshot employment type matches employee",
    latestSnapshot.employment_type,
    employee.employment_type,
  );
  TestValidator.equals(
    "latest snapshot status matches employee",
    latestSnapshot.status,
    employee.status,
  );
  TestValidator.equals(
    "latest snapshot position matches employee position",
    latestSnapshot.position_title,
    employee.position,
  );
  // 7. Validate snapshots are sorted by created_at in descending order
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is not newer than snapshot ${i - 1}`,
        new Date(snapshots.data[i].created_at).getTime() <=
          new Date(snapshots.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 9. Verify snapshot data structure includes required fields
  TestValidator.predicate(
    "latest snapshot has role reference",
    latestSnapshot.role !== null && latestSnapshot.role !== undefined,
  );
  TestValidator.predicate(
    "latest snapshot has member reference",
    latestSnapshot.member !== null && latestSnapshot.member !== undefined,
  );
  TestValidator.predicate(
    "latest snapshot has organization reference",
    latestSnapshot.organization !== null &&
      latestSnapshot.organization !== undefined,
  );
}
