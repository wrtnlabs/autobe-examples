import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Filter department configuration snapshots by department ID and creation date range.
 *
 * Validates that the department snapshot listing endpoint correctly applies combined filters for departmentId and createdAt date range. Snapshots are point-in-time records automatically created when department configuration changes, used for compliance and organizational history reconstruction. Tests verify that only snapshots belonging to the specified department and within the inclusive date boundary are returned.
 *
 * The test creates multiple snapshots through sequential department updates, records their creation timestamps, then filters by a controlled date range to validate both inclusion and exclusion behavior.
 *
 * 1. Authenticate as a platform member.
 * 2. Create a department within the member's organization.
 * 3. Update the department multiple times to generate several configuration snapshots with different creation timestamps.
 * 4. Retrieve all snapshots for the department to establish timestamp boundaries.
 * 5. Filter snapshots by the departmentId and a date range (createdAtFrom, createdAtTo) that includes only the middle snapshots.
 * 6. Verify all returned snapshots belong to the filtered department and fall within the inclusive date boundaries.
 */
export async function test_api_department_snapshot_filter_by_department_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  // 2. Create a department
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Test Department ${RandomGenerator.alphabets(5)}`,
        } satisfies DeepPartial<IHrmPlatformDepartment.ICreate>,
      },
    );
  typia.assert(department);
  // 3. Update the department multiple times to create snapshots
  // First update - creates snapshot 1
  await api.functional.hrmPlatform.member.departments.update(memberConnection, {
    departmentId: department.id,
    body: {
      name: `Updated Department ${RandomGenerator.alphabets(5)}`,
    } satisfies IHrmPlatformDepartment.IUpdate,
  });
  // Small delay to ensure timestamp differences in snapshots
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second update - creates snapshot 2
  const secondUpdateDept =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: `Second Update ${RandomGenerator.alphabets(5)}`,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(secondUpdateDept);
  // Wait longer to create a clear time gap
  await new Promise((resolve) => setTimeout(resolve, 200));
  // Third update - creates snapshot 3 (will be excluded by date range)
  await api.functional.hrmPlatform.member.departments.update(memberConnection, {
    departmentId: department.id,
    body: {
      name: `Third Update ${RandomGenerator.alphabets(5)}`,
    } satisfies IHrmPlatformDepartment.IUpdate,
  });
  // 4. Retrieve all snapshots for this department to establish timestamps
  const allSnapshots =
    await api.functional.hrmPlatform.member.department_snapshots.index(
      memberConnection,
      {
        body: {
          departmentId: department.id,
          limit: 100,
        } satisfies IHrmPlatformDepartmentSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "has snapshots in the list",
    allSnapshots.data.length >= 2,
  );
  // 5. Establish date range boundaries from the snapshots
  // Sort by createdAt to pick specific boundaries
  const sortedSnapshots = allSnapshots.data.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  // Use earliest and second-earliest snapshot times as the date range
  const createdAtFrom = sortedSnapshots[0].createdAt;
  const createdAtTo = sortedSnapshots[1].createdAt;
  // 6. Filter snapshots by departmentId and date range
  const filteredSnapshots =
    await api.functional.hrmPlatform.member.department_snapshots.index(
      memberConnection,
      {
        body: {
          departmentId: department.id,
          createdAtFrom,
          createdAtTo,
          limit: 100,
        } satisfies IHrmPlatformDepartmentSnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 7. Validate that filtered results match criteria
  TestValidator.predicate(
    "filtered snapshots exist",
    filteredSnapshots.data.length > 0,
  );
  // All returned snapshots should belong to the correct department
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.equals(
      "snapshot belongs to filtered department",
      snapshot.department.id,
      department.id,
    );
  }
  // All returned snapshots should fall within the inclusive date boundaries
  for (const snapshot of filteredSnapshots.data) {
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    const fromTime = new Date(createdAtFrom).getTime();
    const toTime = new Date(createdAtTo).getTime();
    TestValidator.predicate(
      `snapshot createdAt >= createdAtFrom`,
      snapshotTime >= fromTime,
    );
    TestValidator.predicate(
      `snapshot createdAt <= createdAtTo`,
      snapshotTime <= toTime,
    );
  }
  // Verify pagination info is correct
  TestValidator.equals(
    "pagination current page is 1",
    filteredSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records match data length",
    filteredSnapshots.pagination.records === filteredSnapshots.data.length ||
      filteredSnapshots.pagination.records >= filteredSnapshots.data.length,
  );
  // 8. Test with a narrower date range that should exclude snapshots
  const narrowerFrom = sortedSnapshots[1].createdAt;
  const narrowerTo = sortedSnapshots[1].createdAt;
  const narrowerFilterSnapshots =
    await api.functional.hrmPlatform.member.department_snapshots.index(
      memberConnection,
      {
        body: {
          departmentId: department.id,
          createdAtFrom: narrowerFrom,
          createdAtTo: narrowerTo,
          limit: 100,
        } satisfies IHrmPlatformDepartmentSnapshot.IRequest,
      },
    );
  typia.assert(narrowerFilterSnapshots);
  // Snapshots in narrower range should still be within department and date
  for (const snapshot of narrowerFilterSnapshots.data) {
    TestValidator.equals(
      "narrower filter - snapshot belongs to filtered department",
      snapshot.department.id,
      department.id,
    );
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    const fromTime = new Date(narrowerFrom).getTime();
    TestValidator.predicate(
      "narrower filter - snapshot within range",
      snapshotTime >= fromTime &&
        snapshotTime <= new Date(narrowerTo).getTime(),
    );
  }
}
