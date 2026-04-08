import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator account creation rejection when email already exists in admin accounts.
 *
 * This test validates the email uniqueness constraint across all administrator accounts. The scenario creates an initial admin account, then attempts to create a second admin account with the same email address, expecting the system to reject the duplicate with a 409 Conflict error.
 *
 * Test Flow:
 * 1. Create first admin account with a specific email using authorize_admin_join utility.
 * 2. Store the email from the first admin creation.
 * 3. Attempt to create a second admin account with the identical email.
 * 4. Verify the duplicate attempt throws an error indicating the uniqueness constraint violation.
 *
 * Business Validation:
 * - Email uniqueness constraint is enforced across all administrator accounts.
 * - System prevents duplicate admin account creation with same email.
 * - Appropriate error response is returned to indicate the constraint violation.
 * - This tests business logic (email uniqueness rule), not input validation - the email format is valid but violates the uniqueness business rule.
 */
export async function test_api_admin_join_duplicate_email_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account with specific email
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: uniqueEmail,
      password: password,
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // 2. Verify first admin was created successfully
  TestValidator.equals("first admin email", firstAdmin.email, uniqueEmail);
  TestValidator.equals("first admin grade", firstAdmin.grade, "regular");
  // 3. Attempt to create second admin with same email (should fail with 409 Conflict)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejection", async () => {
    await authorize_admin_join(secondAdminConnection, {
      body: {
        email: uniqueEmail,
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  });
}
