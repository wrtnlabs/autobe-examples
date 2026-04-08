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
 * Test retrieving an expired password reset token for administrative oversight and security auditing.
 *
 * Validates that the password reset token retrieval endpoint correctly returns expired token records with all associated metadata. The test verifies that expired tokens can be accessed for security monitoring purposes and that the response includes accurate expiration timestamps and user information.
 *
 * Special attention is given to ensuring the expired_at timestamp is in the past, confirming the token's expired status, and that the user object contains the correct customer summary information.
 *
 * 1. Authenticate as a customer to establish session context.
 * 2. Generate a valid UUID representing an expired password reset token ID.
 * 3. Call GET /shoppingMall/customer/password-resets/{resetId} with the expired token ID.
 * 4. Validate the response structure using typia.assert for complete type checking.
 * 5. Verify the expired_at timestamp is before the current time.
 * 6. Confirm user_type is "customer" and user object contains customer summary.
 */
export async function test_api_password_reset_retrieve_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Generate expired token ID (UUID format)
  const expiredResetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve expired password reset token
  const resetToken =
    await api.functional.shoppingMall.customer.password_resets.at(
      customerConnection,
      {
        resetId: expiredResetId,
      },
    );
  typia.assert(resetToken);
  // 4. Validate response structure and expired status
  TestValidator.equals("reset ID matches", resetToken.id, expiredResetId);
  TestValidator.predicate("token exists", resetToken.token.length > 0);
  TestValidator.predicate(
    "created_at exists",
    resetToken.created_at.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    resetToken.expired_at.length > 0,
  );
  // 5. Verify token is expired (expired_at is in the past)
  const expiredAt = new Date(resetToken.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "token is expired (expired_at is before current time)",
    expiredAt < now,
  );
  // 6. Verify user_type is customer
  TestValidator.equals(
    "user_type is customer",
    resetToken.user_type,
    "customer",
  );
  // 7. Narrow type and verify user object contains customer summary fields
  const customerUser = resetToken.user as IShoppingMallCustomer.ISummary;
  TestValidator.predicate("user ID exists", customerUser.id.length > 0);
  TestValidator.predicate(
    "user email exists",
    customerUser.email.length > 0,
  );
  TestValidator.predicate(
    "user display_name exists",
    customerUser.display_name.length > 0,
  );
  TestValidator.predicate(
    "user banned field exists",
    typeof customerUser.banned === "boolean",
  );
  TestValidator.predicate(
    "user created_at exists",
    customerUser.created_at.length > 0,
  );
}