import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test attempting to retrieve a password reset token that does not exist in the system.
 *
 * Validates that the password reset retrieval endpoint correctly handles requests for non-existent tokens by returning an appropriate HTTP 404 Not Found error. This test ensures the API properly handles edge cases where the resetId parameter does not match any record in the customer, seller, or administrator password reset tables.
 *
 * The test authenticates as a customer to access the password reset endpoint, then attempts to retrieve a password reset record using a randomly generated UUID that is guaranteed to not exist in the database. The expected behavior is that the API returns a 404 status code indicating the resource was not found, without leaking sensitive information about the system's internal structure.
 *
 * 1. Authenticate as a customer using the join endpoint
 * 2. Generate a random UUID that does not exist in any password reset table
 * 3. Call GET /shoppingMall/customer/password-resets/{resetId} with the non-existent UUID
 * 4. Verify the API returns HTTP 404 Not Found status
 * 5. Confirm the error response indicates the resource was not found
 */
export async function test_api_password_reset_retrieve_nonexistent_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Generate a non-existent UUID
  const nonExistentResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent password reset token
  await TestValidator.httpError(
    "should return 404 for non-existent password reset token",
    404,
    async () =>
      await api.functional.shoppingMall.customer.password_resets.at(
        customerConnection,
        {
          resetId: nonExistentResetId,
        },
      ),
  );
}
