import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_token_valid_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account for password reset testing
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // Step 2: Request password reset to generate token for test
  // Use customerConnection (not base connection) for API calls after login
  const resetTokenRequest =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(resetTokenRequest);
  // Extract token from the response - we'll assume it's in the first item
  // Use IShoppingMallCustomerPasswordReset instead of ISummary for actual data structure
  const resetTokenItem = resetTokenRequest
    .data[0] as IShoppingMallCustomerPasswordReset;
  const resetId = resetTokenItem.token;
  // Step 3: Verify password reset token details
  const resetTokenDetails =
    await api.functional.shoppingMall.customer.password_resets.at(
      customerConnection,
      {
        resetId: resetId,
      },
    );
  typia.assert(resetTokenDetails);
  // Validate the token is active, unexpired, and valid
  TestValidator.equals(
    "token should match expected format",
    resetTokenDetails.token.length >= 36,
    true,
  );
  TestValidator.equals(
    "expires_at should be a valid date string",
    resetTokenDetails.expires_at.length > 0,
    true,
  );
  // Additional check for token expiration - check if token isn't expired
  const now = new Date().toISOString();
  TestValidator.predicate(
    "token should not be expired",
    new Date(resetTokenDetails.expires_at) > new Date(now),
  );
}
