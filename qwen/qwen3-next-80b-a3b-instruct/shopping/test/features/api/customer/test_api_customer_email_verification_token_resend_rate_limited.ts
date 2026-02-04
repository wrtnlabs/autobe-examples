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
export async function test_api_customer_email_verification_token_resend_rate_limited(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account that is not yet email verified
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerData });
  // Step 2: Create a second customer account for unrelated validation
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(secondCustomerConnection, {
    body: secondCustomerData,
  });
  // Step 3: First request - should succeed (first time requesting verification)
  const firstResponse =
    await api.functional.shoppingMall.customer.auth.customers.email.resend(
      customerConnection,
    );
  typia.assert<IShoppingMallCustomerEmailVerification>(firstResponse);
  TestValidator.equals(
    "first response message",
    firstResponse.message,
    "Email verification token resent successfully",
  );
  // Step 4: Second request within 15-minute window - privacy policy requires same success message (no error exposed)
  const secondResponse =
    await api.functional.shoppingMall.customer.auth.customers.email.resend(
      customerConnection,
    );
  typia.assert<IShoppingMallCustomerEmailVerification>(secondResponse);
  TestValidator.equals(
    "second response message matches first",
    secondResponse.message,
    "Email verification token resent successfully",
  );
  // Step 5: Verify that a request from a different customer works fine (confirms rate limit is per-customer)
  const thirdResponse =
    await api.functional.shoppingMall.customer.auth.customers.email.resend(
      secondCustomerConnection,
    );
  typia.assert<IShoppingMallCustomerEmailVerification>(thirdResponse);
  TestValidator.equals(
    "third response message",
    thirdResponse.message,
    "Email verification token resent successfully",
  );
}
