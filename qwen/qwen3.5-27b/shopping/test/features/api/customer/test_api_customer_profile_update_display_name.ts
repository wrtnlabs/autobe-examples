import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer profile display name update functionality.
 *
 * This test validates the complete workflow for updating a customer's display name:
 * 1. Register a new customer account with an initial display name
 * 2. Authenticate the customer to obtain access tokens
 * 3. Update the display name to a new value
 * 4. Verify the response contains the updated profile with the new display name
 * 5. Validate that other profile fields remain unchanged
 * 6. Confirm the updated_at timestamp has been refreshed
 */
export async function test_api_customer_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Store initial values for comparison
  const initialUpdatedAt = customer.updated_at;
  // 2. Update display name to a new value
  const newDisplayName = RandomGenerator.name();
  const updatedCustomer =
    await api.functional.shoppingMall.customer.profile.update(
      customerConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // 3. Validate the response
  TestValidator.equals(
    "display name updated",
    updatedCustomer.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name changed",
    updatedCustomer.display_name,
    initialDisplayName,
  );
  // 4. Verify other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    updatedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "phone number unchanged",
    updatedCustomer.phone_number,
    customer.phone_number,
  );
  TestValidator.equals(
    "status unchanged",
    updatedCustomer.status,
    customer.status,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCustomer.created_at,
    customer.created_at,
  );
  // 5. Verify updated_at timestamp has been refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCustomer.updated_at,
    initialUpdatedAt,
  );
  // 6. Verify account is still active
  TestValidator.equals(
    "account still active",
    updatedCustomer.status,
    "active",
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedCustomer.deleted_at === null,
  );
}
