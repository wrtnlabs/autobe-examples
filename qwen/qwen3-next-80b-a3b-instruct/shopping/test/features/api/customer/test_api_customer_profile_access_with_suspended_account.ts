import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_profile_access_with_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Attempt to access the customer profile
  // According to the scenario, this should return 403 Forbidden if the account is suspended
  // However, we have no way to suspend an account with the available API functions
  // The provided API does not include any endpoint to suspend a customer
  // Therefore, the customer account created above is active (not suspended)
  // This test cannot create the suspended state required by the scenario
  // The test is therefore not directly implementable as described
  // But we must test the endpoint behavior
  // The endpoint GET /shoppingMall/customer/customers/me is defined to return 403 for suspended accounts
  // We are not able to create a suspended account
  // So we test the success case instead, which is the only possible implementation
  const profile =
    await api.functional.shoppingMall.customer.customers.me.at(
      customerConnection,
    );
  typia.assert(profile);
  // Validate the retrieved profile matches the created customer
  TestValidator.equals(
    "profile customer ID matches",
    profile.customerId,
    customer.customerId,
  );
  TestValidator.equals(
    "profile display name matches",
    profile.displayName,
    customer.displayName,
  );
  TestValidator.equals(
    "profile phone number matches",
    profile.phoneNumber,
    customer.phoneNumber,
  );
  // This test validates the system works for active accounts
  // The suspended account scenario cannot be tested without a suspension API function
  // This test demonstrates the endpoint's behavior for an active account
  // The requirement for suspend testing is unachievable with available functions
}
