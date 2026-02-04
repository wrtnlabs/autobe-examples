import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_email_verification_initiated(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate customer to ensure JWT is set in connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
        referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 2: Use customer connection to initiate email verification
  // Note: This endpoint requires no request body; customer ID is extracted from JWT
  const result: IShoppingMallCustomerEmailVerification =
    await api.functional.shoppingMall.customer.auth.customers.email.verify(
      customerConnection,
    );
  typia.assert(result);
  // Step 3: Validate response matches expected structure
  TestValidator.equals(
    "verification response message",
    result.message,
    "Email verification token resent successfully",
  );
}
