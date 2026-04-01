import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer profile update with new display name and phone number.
 *
 * This test validates the complete customer profile update workflow:
 * 1. Register a new customer account to establish authentication context
 * 2. Update the customer's profile with new display_name and phone_number
 * 3. Verify the response contains updated values with proper customer relation
 *
 * The profile update is a core feature allowing customers to modify their
 * public identity information displayed on orders, reviews, and profile pages.
 */
export async function test_api_customer_profile_update_with_new_display_name_and_phone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate new profile values
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  // 3. Update customer profile with new display name and phone number
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
          phone_number: newPhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate updated profile contains correct values
  TestValidator.equals(
    "display_name",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals("customer id", updatedProfile.customer.id, customer.id);
  TestValidator.equals(
    "customer email",
    updatedProfile.customer.email,
    customer.email,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedProfile.updated_at,
    customer.profile.updated_at,
  );
}
