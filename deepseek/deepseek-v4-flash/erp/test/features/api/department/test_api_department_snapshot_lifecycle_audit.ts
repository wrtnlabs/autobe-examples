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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartmentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

/**
 * Test the complete department lifecycle audit trail through snapshots.
 *
 * Validates that creating, updating, and deleting a department each automatically generates a corresponding immutable snapshot in the audit history. Ensures the snapshot endpoint returns all three snapshots with correct change types, ordered by creation timestamp descending (most recent first).
 *
 * This test covers the full CRUD lifecycle of a department and verifies that the snapshot mechanism faithfully records every state change for audit purposes.
 *
 * 1. Join as a new member via the `authorize_member_join` utility.
 * 2. Create an organization (member becomes owner) via the organization generation utility.
 * 3. Create a department named "Engineering" — triggers a 'created' snapshot.
 * 4. Update the department, renaming it to "Engineering Team" — triggers an 'updated' snapshot.
 * 5. Delete the department — triggers a 'deleted' snapshot.
 * 6. Query the snapshot history via `PATCH /member/departments/{departmentId}/snapshots` with no filters.
 * 7. Assert that all 3 snapshots are returned, each with the correct change_type ('deleted', 'updated', 'created' in descending order by created_at).
 */
export async function test_api_department_snapshot_lifecycle_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a department ("Engineering") — triggers 'created' snapshot
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
        },
      },
    );
  typia.assert(department);
  // 4. Update the department (rename to "Engineering Team") — triggers 'updated' snapshot
  const updatedDepartment =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: "Engineering Team",
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 5. Delete the department — triggers 'deleted' snapshot
  await api.functional.hrmTimeTracking.member.departments.erase(
    memberConnection,
    {
      departmentId: department.id,
    },
  );
  // 6. Query snapshot history with no filters
  const snapshotsPage =
    await api.functional.hrmTimeTracking.member.departments.snapshots.index(
      memberConnection,
      {
        departmentId: department.id,
        body: {},
      },
    );
  typia.assert(snapshotsPage);
  // 7. Assert all 3 snapshots exist with correct change types
  TestValidator.equals("snapshot count", snapshotsPage.data.length, 3);
  // Default sort is created_at_desc (most recent first): deleted, updated, created
  TestValidator.equals(
    "first snapshot change type is deleted",
    snapshotsPage.data[0].changeType,
    "deleted",
  );
  TestValidator.equals(
    "second snapshot change type is updated",
    snapshotsPage.data[1].changeType,
    "updated",
  );
  TestValidator.equals(
    "third snapshot change type is created",
    snapshotsPage.data[2].changeType,
    "created",
  );
  // Validate descending order by createdAt
  TestValidator.predicate(
    "snapshots are ordered by created_at descending",
    () => {
      for (let i = 1; i < snapshotsPage.data.length; i++) {
        if (
          snapshotsPage.data[i - 1].createdAt < snapshotsPage.data[i].createdAt
        ) {
          return false;
        }
      }
      return true;
    },
  );
}
