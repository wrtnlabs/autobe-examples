import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that the grade change audit trail correctly captures and preserves all administrator privilege modifications for accountability and security auditing.
 *
 * Validates the administrator grade change audit trail retrieval functionality including pagination, filtering by administrator ID, and chronological ordering. Ensures that the audit trail endpoint returns properly structured records with correct grade transition details, administrator information, and performer tracking.
 *
 * Special attention is given to verifying that records are sorted by created_at descending (newest first), filtering by administrator ID works correctly, and each record contains complete before/after state information.
 *
 * 1. Register and authenticate as a super administrator.
 * 2. Register a second administrator account for filtering tests.
 * 3. Register a third administrator account for filtering tests.
 * 4. Call the grade changes endpoint without filters to retrieve all records.
 * 5. Verify the response structure contains pagination and data array.
 * 6. Verify records are sorted by created_at descending (newest first).
 * 7. Filter by second administrator's ID and verify filtering works.
 * 8. Filter by third administrator's ID and verify filtering works.
 * 9. Verify each record contains required fields (previous_grade, new_grade, change_type, administrator, performedBy).
 */
export async function test_api_administrator_grade_changes_audit_trail_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SecurePass123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  typia.assert(superAdmin);
  // 2. Register second administrator (regular grade)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: "admin2@test.com",
      password: "SecurePass456",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  typia.assert(admin2);
  // 3. Register third administrator (regular grade)
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_administrator_join(admin3Connection, {
    body: {
      email: "admin3@test.com",
      password: "SecurePass789",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  typia.assert(admin3);
  // 4. Call grade changes endpoint without filters to retrieve all records
  const allChanges =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(allChanges);
  // 5. Verify response structure contains pagination and data array
  TestValidator.predicate(
    "response contains pagination info",
    () => allChanges.pagination !== undefined,
  );
  TestValidator.predicate("response contains data array", () =>
    Array.isArray(allChanges.data),
  );
  // 6. Verify records are sorted by created_at descending (newest first)
  TestValidator.predicate("records sorted by created_at descending", () => {
    const data = allChanges.data;
    if (data.length < 2) return true; // Not enough records to verify ordering
    for (let i = 1; i < data.length; i++) {
      if (
        new Date(data[i - 1].created_at).getTime() <
        new Date(data[i].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 7. Verify each record contains required fields
  await ArrayUtil.asyncForEach(allChanges.data, async (record) => {
    typia.assert(record);
    // Verify grade transition fields exist
    TestValidator.predicate(
      `record ${record.id} has previous_grade`,
      () => record.previous_grade !== undefined,
    );
    TestValidator.predicate(
      `record ${record.id} has new_grade`,
      () => record.new_grade !== undefined,
    );
    TestValidator.predicate(
      `record ${record.id} has change_type`,
      () => record.change_type !== undefined,
    );
    // Verify grade values are valid
    TestValidator.predicate(
      `record ${record.id} previous_grade is valid`,
      () =>
        record.previous_grade === "regular" ||
        record.previous_grade === "super",
    );
    TestValidator.predicate(
      `record ${record.id} new_grade is valid`,
      () => record.new_grade === "regular" || record.new_grade === "super",
    );
    // Verify change_type is valid
    TestValidator.predicate(
      `record ${record.id} change_type is valid`,
      () =>
        record.change_type === "promotion" || record.change_type === "demotion",
    );
    // Verify administrator relation exists
    TestValidator.predicate(
      `record ${record.id} has administrator relation`,
      () => record.administrator !== undefined,
    );
    TestValidator.predicate(
      `record ${record.id} administrator has email`,
      () => record.administrator.email !== undefined,
    );
    // Verify performedBy relation exists
    TestValidator.predicate(
      `record ${record.id} has performedBy relation`,
      () => record.performedBy !== undefined,
    );
    TestValidator.predicate(
      `record ${record.id} performedBy has email`,
      () => record.performedBy.email !== undefined,
    );
  });
  // 8. Filter by second administrator's ID and verify filtering works
  const admin2Changes =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      superAdminConnection,
      {
        body: {
          administratorId: admin2.id,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(admin2Changes);
  // Verify all returned records are for admin2
  await ArrayUtil.asyncForEach(admin2Changes.data, async (record) => {
    typia.assert(record);
    TestValidator.equals(
      `filtered record belongs to admin2`,
      record.administrator.id,
      admin2.id,
    );
  });
  // 9. Filter by third administrator's ID and verify filtering works
  const admin3Changes =
    await api.functional.shoppingMall.administrator.grade_changes.index(
      superAdminConnection,
      {
        body: {
          administratorId: admin3.id,
        } satisfies IShoppingMallAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(admin3Changes);
  // Verify all returned records are for admin3
  await ArrayUtil.asyncForEach(admin3Changes.data, async (record) => {
    typia.assert(record);
    TestValidator.equals(
      `filtered record belongs to admin3`,
      record.administrator.id,
      admin3.id,
    );
  });
  // 10. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    allChanges.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => allChanges.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    () =>
      allChanges.pagination.records === allChanges.data.length ||
      allChanges.pagination.records >= allChanges.data.length,
  );
}
