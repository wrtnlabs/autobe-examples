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
 * Test retrieving an existing password reset token by its unique identifier.
 *
 * Validates that the password reset retrieval endpoint returns complete token information including token details, timestamps, and associated user information. The test verifies the response structure contains all required fields and that the user_type discriminator correctly identifies the account type.
 *
 * Special attention is given to ensuring the response includes valid datetime values for created_at and expired_at, and that the user object contains the appropriate summary information based on the user_type discriminator.
 *
 * 1. Authenticate as a customer to establish a valid session.
 * 2. Generate a valid UUID to use as the resetId parameter.
 * 3. Call the password reset retrieval endpoint with the resetId.
 * 4. Validate the response structure contains all required fields.
 * 5. Verify the user_type is one of the valid discriminator values.
 * 6. Verify timestamps are valid datetime values.
 */
export async function test_api_password_reset_retrieve_existing_token(
  connection: api.IConnection,
) {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Generate a valid UUID for resetId
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve password reset token
  const passwordReset: IShoppingMallCustomerPasswordReset =
    await api.functional.shoppingMall.customer.password_resets.at(
      customerConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate resetId matches the request
  TestValidator.equals("resetId matches request", passwordReset.id, resetId);
  // 5. Verify user_type is valid discriminator
  TestValidator.predicate(
    "user_type is valid discriminator",
    passwordReset.user_type === "customer" ||
      passwordReset.user_type === "seller" ||
      passwordReset.user_type === "administrator",
  );
  // 6. Verify token is present and not empty
  TestValidator.predicate("token is not empty", passwordReset.token.length > 0);
  // 7. Verify expired_at is after created_at (business logic)
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(passwordReset.expired_at) > new Date(passwordReset.created_at),
  );
  // 8. Verify user object has required fields based on user_type
  if (passwordReset.user_type === "customer") {
    const customerUser = passwordReset.user as IShoppingMallCustomer.ISummary;
    TestValidator.equals(
      "customer user has display_name",
      typeof customerUser.display_name,
      "string",
    );
    TestValidator.predicate(
      "customer display_name is not empty",
      customerUser.display_name.length > 0,
    );
  } else if (passwordReset.user_type === "seller") {
    const sellerUser = passwordReset.user as IShoppingMallSeller.ISummary;
    TestValidator.equals(
      "seller user has approval_status",
      typeof sellerUser.approval_status,
      "string",
    );
  } else if (passwordReset.user_type === "administrator") {
    const adminUser = passwordReset.user as IShoppingMallAdministrator.ISummary;
    TestValidator.equals(
      "administrator user has grade",
      typeof adminUser.grade,
      "string",
    );
  }
}