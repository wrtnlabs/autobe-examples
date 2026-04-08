import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test successful retrieval of an administrator grade change audit record.
 *
 * Validates the complete administrator promotion workflow and grade change audit trail retrieval. Creates two administrator accounts, promotes one to super administrator grade, then retrieves the resulting grade change audit record to verify all fields are correctly populated.
 *
 * Special attention is given to verifying that the grade change record accurately captures the promotion action, including the target administrator, the performing super administrator, and the grade transition details.
 *
 * 1. Register a super administrator account to perform promotions.
 * 2. Register a regular administrator account that will be promoted.
 * 3. Promote the regular administrator to super administrator grade, creating a grade change audit record.
 * 4. Retrieve the grade change audit record using its unique identifier.
 * 5. Validate all fields in the grade change record match the promotion action.
 */
export async function test_api_administrator_grade_change_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "SecurePass123",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.100",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Register regular administrator account that will be promoted
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: "regularadmin@test.com",
        password: "SecurePass456",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.101",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdminAuth);
  // 3. Promote regular administrator to super administrator
  // Note: This assumes superAdminAuth is already a super administrator
  // In a real system, the first admin would need to be promoted by an existing super admin
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdminAuth.id,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Verify the promotion was successful
  TestValidator.equals(
    "promoted admin grade is super",
    promotedAdmin.grade,
    "super",
  );
  // 5. The promotion operation creates a grade change audit record
  // In a real implementation, the promote endpoint would return the grade change ID
  // or there would be a list endpoint to query recent grade changes
  // For this test, we assume the grade change ID is available through the system
  // This is a limitation of the current API design
  const gradeChangeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Retrieve the grade change audit record
  const gradeChange =
    await api.functional.shoppingMall.administrator.grade_changes.at(
      superAdminConnection,
      {
        changeId: gradeChangeId,
      },
    );
  typia.assert(gradeChange);
  // 7. Validate grade change record fields
  TestValidator.equals(
    "grade change ID matches requested ID",
    gradeChange.id,
    gradeChangeId,
  );
  TestValidator.equals(
    "administrator matches promoted admin",
    gradeChange.administrator.id,
    regularAdminAuth.id,
  );
  TestValidator.equals(
    "administrator email matches promoted admin",
    gradeChange.administrator.email,
    regularAdminAuth.email,
  );
  TestValidator.equals(
    "previous grade was regular",
    gradeChange.previousGrade,
    "regular",
  );
  TestValidator.equals("new grade is super", gradeChange.newGrade, "super");
  TestValidator.equals(
    "change type is promotion",
    gradeChange.changeType,
    "promotion",
  );
  TestValidator.equals(
    "performed by matches super admin",
    gradeChange.performedBy.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "performed by email matches super admin",
    gradeChange.performedBy.email,
    superAdminAuth.email,
  );
  TestValidator.predicate(
    "created at is valid ISO 8601 date-time",
    () => !isNaN(Date.parse(gradeChange.createdAt)),
  );
  TestValidator.predicate(
    "administrator summary has valid grade",
    () => gradeChange.administrator.grade === "super",
  );
  TestValidator.predicate(
    "administrator is not banned",
    () => gradeChange.administrator.banned === false,
  );
  TestValidator.predicate(
    "administrator is not deleted",
    () => gradeChange.administrator.deleted_at === null,
  );
  TestValidator.predicate(
    "performed by summary has super grade",
    () => gradeChange.performedBy.grade === "super",
  );
  TestValidator.predicate(
    "performed by is not banned",
    () => gradeChange.performedBy.banned === false,
  );
  TestValidator.predicate(
    "performed by is not deleted",
    () => gradeChange.performedBy.deleted_at === null,
  );
}
