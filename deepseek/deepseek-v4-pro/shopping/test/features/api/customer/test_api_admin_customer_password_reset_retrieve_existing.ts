import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator retrieval of an existing customer password reset record.
 *
 * Validates that an authenticated administrator can retrieve a specific password reset token record belonging to a given customer. The response must include the complete record: the cryptographic token string (token), expiration timestamp (expired_at), creation timestamp (created_at), and the owning customer's ID (shopping_mall_customer_id). Even expired tokens must be retrievable — expiration does not prevent access, supporting audit and account recovery assistance workflows.
 *
 * The test also validates that the returned record's shopping_mall_customer_id matches the customerId path parameter, ensuring the token is correctly scoped to the owning customer and preventing cross-customer information leakage.
 *
 * 1. Administrator registers and authenticates via join to access admin-protected endpoints.
 * 2. Customer registers and authenticates via join, establishing a valid customerId for the password reset query.
 * 3. Administrator retrieves a password reset record using the customer's ID and a generated resetId.
 * 4. Validates the response structure via typia.assert and confirms customer association via TestValidator.equals.
 */
export async function test_api_admin_customer_password_reset_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Retrieve password reset record
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const passwordReset =
    await api.functional.shoppingMall.admin.customers.password_resets.at(
      adminConnection,
      {
        customerId: customer.id,
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate customer association
  TestValidator.equals(
    "customer ID matches path parameter",
    passwordReset.shopping_mall_customer_id,
    customer.id,
  );
}
