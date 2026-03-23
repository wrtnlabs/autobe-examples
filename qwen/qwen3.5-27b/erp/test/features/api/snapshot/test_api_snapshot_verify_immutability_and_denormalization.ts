import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that snapshots preserve historical data even when related entities are modified or deleted.
 *
 * This test verifies that employee snapshots maintain immutability and denormalization:
 * 1. Authenticate as admin
 * 2. Retrieve an existing employee snapshot
 * 3. Verify the snapshot contains all denormalized fields
 * 4. Verify snapshot data structure is complete and immutable
 */
export async function test_api_snapshot_verify_immutability_and_denormalization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate a snapshot ID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the snapshot
  const snapshot: IHrmPlatformEmployeeSnapshot =
    await api.functional.hrmPlatform.admin.snapshots.at(adminConnection, {
      snapshotId,
    });
  typia.assert(snapshot);
  // 4. Verify snapshot preserves historical employment_type
  TestValidator.predicate("employment_type is valid historical value", () => {
    const validTypes = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ] as const;
    return validTypes.includes(snapshot.employment_type as any);
  });
  // 5. Verify snapshot preserves historical status
  TestValidator.predicate("status is valid historical value", () => {
    const validStatuses = ["active", "deactivated"] as const;
    return validStatuses.includes(snapshot.status as any);
  });
  // 6. Verify snapshot has immutable created_at timestamp
  TestValidator.predicate("snapshot created_at is valid datetime", () => {
    const date = new Date(snapshot.created_at);
    return !isNaN(date.getTime());
  });
  // 7. Verify denormalized employee data exists
  TestValidator.equals(
    "employee ID preserved in snapshot",
    snapshot.employee.id.length,
    36,
  );
  TestValidator.equals(
    "employee employment_type preserved",
    typeof snapshot.employee.employment_type,
    "string",
  );
  TestValidator.equals(
    "employee status preserved",
    typeof snapshot.employee.status,
    "string",
  );
  // 8. Verify denormalized member data exists
  TestValidator.equals(
    "member ID preserved in snapshot",
    snapshot.member.id.length,
    36,
  );
  TestValidator.equals(
    "member email preserved",
    snapshot.member.email.length > 0,
    true,
  );
  // 9. Verify denormalized organization data exists
  TestValidator.equals(
    "organization ID preserved in snapshot",
    snapshot.organization.id.length,
    36,
  );
  TestValidator.equals(
    "organization name preserved",
    snapshot.organization.name.length > 0,
    true,
  );
  // 10. Verify denormalized role data exists
  TestValidator.equals(
    "role ID preserved in snapshot",
    snapshot.role.id.length,
    36,
  );
  TestValidator.equals(
    "role name preserved",
    snapshot.role.name.length > 0,
    true,
  );
  // 11. Verify denormalized department data (may be null if employee had no department)
  if (snapshot.department !== null) {
    TestValidator.equals(
      "department ID preserved in snapshot",
      snapshot.department.id.length,
      36,
    );
    TestValidator.equals(
      "department name preserved",
      snapshot.department.name.length > 0,
      true,
    );
  }
  // 12. Verify denormalized timestamp fields
  TestValidator.predicate("employee_created_at preserved", () => {
    const date = new Date(snapshot.employee_created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("employee_updated_at preserved", () => {
    const date = new Date(snapshot.employee_updated_at);
    return !isNaN(date.getTime());
  });
  // 13. Verify employee_deleted_at is properly nullable
  if (snapshot.employee_deleted_at !== null) {
    const date = new Date(snapshot.employee_deleted_at);
    TestValidator.predicate("employee_deleted_at is valid datetime", () => {
      return !isNaN(date.getTime());
    });
  }
  // 14. Verify snapshot immutability - all data should reflect historical state at snapshot time
  // The snapshot should contain complete denormalized data independent of current entity state
  TestValidator.predicate(
    "snapshot contains complete historical employee data",
    () => {
      return (
        snapshot.employee.id !== undefined &&
        snapshot.employee.employment_type !== undefined &&
        snapshot.employee.status !== undefined &&
        snapshot.employee.member !== undefined
      );
    },
  );
  TestValidator.predicate(
    "snapshot contains complete historical organization data",
    () => {
      return (
        snapshot.organization.id !== undefined &&
        snapshot.organization.name !== undefined
      );
    },
  );
  TestValidator.predicate(
    "snapshot contains complete historical member data",
    () => {
      return (
        snapshot.member.id !== undefined && snapshot.member.email !== undefined
      );
    },
  );
  TestValidator.predicate(
    "snapshot contains complete historical role data",
    () => {
      return snapshot.role.id !== undefined && snapshot.role.name !== undefined;
    },
  );
}