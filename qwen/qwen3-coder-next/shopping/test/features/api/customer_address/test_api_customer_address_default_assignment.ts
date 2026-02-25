import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_address_default_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "1234";
  const customerName = RandomGenerator.name();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string &
          (tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>)
      >(),
      password: customerPassword,
      display_name: customerName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Create first address (should become default)
  const firstAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe",
          phone_number: RandomGenerator.mobile(),
          street_address: "123 Main Street",
          city: "Seoul",
          state: "Seoul",
          postal_code: "01234",
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // 3. Verify first address is default
  TestValidator.equals(
    "first address is default",
    firstAddress.isDefault,
    true,
  );
  // 4. Create second address (should NOT be default)
  const secondAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "Jane Doe",
          phone_number: RandomGenerator.mobile(),
          street_address: "456 Oak Avenue",
          city: "Busan",
          state: "Busan",
          postal_code: "54321",
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // 5. Verify second address is not default
  TestValidator.equals(
    "second address is not default",
    secondAddress.isDefault,
    false,
  );
  // 6. Verify first address remains default after second creation
  const fetchedFirstAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "John Doe Updated",
          phone_number: RandomGenerator.mobile(),
          street_address: "123 Main Street Updated",
          city: "Seoul",
          state: "Seoul",
          postal_code: "01234",
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(fetchedFirstAddress);
  TestValidator.equals(
    "first address remains default",
    fetchedFirstAddress.isDefault,
    true,
  );
}
