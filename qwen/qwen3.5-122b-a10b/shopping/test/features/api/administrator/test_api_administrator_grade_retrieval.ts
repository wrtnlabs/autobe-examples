import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator grade retrieval functionality.
 *
 * Validates that an authenticated administrator can successfully retrieve their own grade assignment through the grade inquiry endpoint. The test verifies the complete grade assignment record including permission level, administrator identity, and audit timestamps.
 *
 * This test ensures administrators can view their current privilege level which determines their permission boundaries and available actions on the platform. It validates both the data structure and business logic of the grade retrieval system.
 *
 * 1. Register a new administrator account with random credentials.
 * 2. Extract the administrator ID from the registration response.
 * 3. Retrieve the grade assignment using the admin ID endpoint.
 * 4. Validates grade level is either 'regular' or 'super'.
 * 5. Validates administrator email matches the registered account.
 * 6. Validates all timestamp fields (created_at, updated_at, deleted_at).
 * 7. Confirms deleted_at is null for active administrator accounts.
 */
export async function test_api_administrator_grade_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IEcommerceAdmin.IAuthorized =
    await authorize_admin_join(adminConnection);
  typia.assert(adminAuthorized);
  // 2. Extract admin ID
  const adminId = adminAuthorized.id;
  // 3. Retrieve grade assignment
  const grade: IEcommerceAdministratorGrade =
    await api.functional.ecommerce.admin.grades.at(adminConnection, {
      adminId,
    });
  typia.assert(grade);
  // 4. Validate grade level
  TestValidator.predicate(
    "grade is regular or super",
    grade.grade === "regular" || grade.grade === "super",
  );
  // 5. Validate admin email matches
  TestValidator.equals(
    "admin email matches registered email",
    grade.ecommerceAdmin.email,
    adminAuthorized.email,
  );
  // 6. Validate grade level in admin summary matches grade record
  TestValidator.equals(
    "admin summary grade matches grade record",
    typia.assert<"regular" | "super">(grade.ecommerceAdmin.grade),
    typia.assert<"regular" | "super">(grade.grade),
  );
  // 7. Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    grade.deleted_at,
    null,
  );
}