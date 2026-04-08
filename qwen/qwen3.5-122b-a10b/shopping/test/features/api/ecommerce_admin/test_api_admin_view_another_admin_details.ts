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
 * Test administrator viewing another administrator's account details.
 *
 * Validates that an authenticated administrator can retrieve detailed information about another administrator account on the platform. The test creates two separate admin accounts, authenticates the requesting admin, and verifies they can access the target admin's complete profile including email, grade level, and account timestamps.
 *
 * This test ensures the admin management workflow functions correctly for oversight and administrative purposes. Special attention is given to verifying that grade information is properly joined from the administrator grades table and that sensitive data like password hashes are never exposed in API responses.
 *
 * 1. Create and authenticate the requesting administrator account.
 * 2. Create a separate target administrator account.
 * 3. Retrieve the target admin's details using their adminId.
 * 4. Validate response contains all required fields (id, email, grade, created_at, updated_at, deleted_at).
 * 5. Verify grade information includes grade level and admin summary.
 * 6. Confirm password hash is not exposed in the response.
 * 7. Validate timestamps are properly formatted as ISO 8601 date-time strings.
 */
export async function test_api_admin_view_another_admin_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the requesting admin
  const requestingAdminConnection: api.IConnection = { host: connection.host };
  const requestingAdmin = await authorize_admin_join(
    requestingAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(requestingAdmin);
  // 2. Create a separate target admin account
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // 3. Requesting admin views target admin's details
  const targetAdminDetails = await api.functional.ecommerce.admin.admins.at(
    requestingAdminConnection,
    {
      adminId: targetAdmin.id,
    },
  );
  typia.assert(targetAdminDetails);
  // 4. Validate response structure
  TestValidator.equals(
    "admin ID matches",
    targetAdminDetails.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    targetAdminDetails.email,
    targetAdmin.email,
  );
  TestValidator.predicate(
    "created_at exists",
    targetAdminDetails.created_at !== null &&
      targetAdminDetails.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    targetAdminDetails.updated_at !== null &&
      targetAdminDetails.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active admin",
    targetAdminDetails.deleted_at === null,
  );
  // 5. Validate grade information is present
  TestValidator.predicate(
    "grade exists",
    targetAdminDetails.grade !== null && targetAdminDetails.grade !== undefined,
  );
  if (
    targetAdminDetails.grade !== null &&
    targetAdminDetails.grade !== undefined
  ) {
    TestValidator.predicate(
      "grade has grade level",
      targetAdminDetails.grade.grade.length > 0,
    );
    TestValidator.predicate(
      "grade has admin summary",
      targetAdminDetails.grade.admin !== null &&
        targetAdminDetails.grade.admin !== undefined,
    );
    if (
      targetAdminDetails.grade.admin !== null &&
      targetAdminDetails.grade.admin !== undefined
    ) {
      TestValidator.equals(
        "grade admin ID matches",
        targetAdminDetails.grade.admin.id,
        targetAdmin.id,
      );
      TestValidator.equals(
        "grade admin email matches",
        targetAdminDetails.grade.admin.email,
        targetAdmin.email,
      );
    }
  }
  // 6. Verify password is not exposed (should not exist in response)
  TestValidator.predicate(
    "password not exposed",
    !("password" in targetAdminDetails) &&
      !("password_hash" in targetAdminDetails),
  );
}
