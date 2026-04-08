import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_organizations_departments_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_snapshots_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_departments_snapshot } from "../../../prepare/prepare_random_hrm_platform_departments_snapshot";

export async function test_api_department_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.member);
  const organizationId = (memberAuth.member as any).organization.id;
  // 2. Create a department with initial attributes
  const newConnection: api.IConnection = { host: connection.host };
  const department =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      newConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  typia.assert(department.organization);
  const departmentId = department.id;
  const initialDepartmentName = department.name;
  const initialUpdatedAt = department.updated_at;
  // 3. Create first snapshot capturing initial state
  const snapshotConnection1: api.IConnection = { host: connection.host };
  const firstSnapshot =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.create(
      snapshotConnection1,
      {
        organizationId,
        departmentId,
        body: {},
      },
    );
  typia.assert(firstSnapshot);
  typia.assert(firstSnapshot.department);
  // 4. Update the department (modify name and description)
  const updateConnection: api.IConnection = { host: connection.host };
  const updatedDepartmentName = RandomGenerator.name();
  const updatedDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      updateConnection,
      {
        organizationId,
        departmentId,
        body: {
          name: updatedDepartmentName,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  const updatedUpdatedAt = updatedDepartment.updated_at;
  // Verify department was actually updated
  TestValidator.notEquals(
    "department name changed after update",
    initialDepartmentName,
    updatedDepartment.name,
  );
  // 5. Create second snapshot capturing updated state
  const snapshotConnection2: api.IConnection = { host: connection.host };
  const secondSnapshot =
    await api.functional.hrmPlatform.member.organizations.departments.snapshots.create(
      snapshotConnection2,
      {
        organizationId,
        departmentId,
        body: {},
      },
    );
  typia.assert(secondSnapshot);
  typia.assert(secondSnapshot.department);
  // 6. Compare both snapshots to verify they capture different states
  // Validate first snapshot captures initial department values
  TestValidator.equals(
    "first snapshot captures initial department name",
    firstSnapshot.name,
    initialDepartmentName,
  );
  // Validate second snapshot captures updated department values
  TestValidator.equals(
    "second snapshot captures updated department name",
    secondSnapshot.name,
    updatedDepartment.name,
  );
  // Validate snapshot.updatedAt reflects the department's updatedAt at time of snapshot creation
  TestValidator.equals(
    "first snapshot updatedAt matches department updatedAt at snapshot time",
    firstSnapshot.updatedAt,
    initialUpdatedAt,
  );
  TestValidator.equals(
    "second snapshot updatedAt matches department updatedAt at snapshot time",
    secondSnapshot.updatedAt,
    updatedUpdatedAt,
  );
  // Validate snapshot.updatedAt differs between first and second snapshot
  TestValidator.notEquals(
    "snapshots have different updatedAt timestamps",
    firstSnapshot.updatedAt,
    secondSnapshot.updatedAt,
  );
  // Validate both snapshots retain their original captured values
  // (first snapshot should still have initial name even after department was updated)
  TestValidator.equals(
    "first snapshot retains initial department name after subsequent update",
    firstSnapshot.name,
    initialDepartmentName,
  );
  // Validate the audit trail preserves complete history
  // First snapshot should have different name than second snapshot
  TestValidator.notEquals(
    "audit trail preserves different department states",
    firstSnapshot.name,
    secondSnapshot.name,
  );
}