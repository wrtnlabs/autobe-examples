import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
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

export async function test_api_customer_address_update_valid_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer to perform address operations
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // Step 2: Create a new shipping address for subsequent update
  const address: IShoppingMallCustomerAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient: "Customer Test",
          phone: "01012341234",
          street: "123 Main St",
          city: "Seoul",
          postal_code: "06001",
          country_code: "KR",
          is_default: true,
        },
      },
    );
  // Step 3: Update the newly created address with valid fields
  const updatedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: address.id,
        body: {
          street: "456 Updated Street",
          city: "Seoul",
          postal_code: "06005",
          country_code: "KR",
        } satisfies IShoppingMallCustomerAddress.IUpdate,
      },
    );
  // Step 4: Verify the address was updated correctly
  TestValidator.equals(
    "update should preserve non-updated fields",
    updatedAddress.recipient,
    "Customer Test",
  );
  TestValidator.equals(
    "update should preserve is_default",
    updatedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "new street should match",
    updatedAddress.street,
    "456 Updated Street",
  );
  TestValidator.equals("new city should match", updatedAddress.city, "Seoul");
  TestValidator.equals(
    "new postal code should match",
    updatedAddress.postal_code,
    "06005",
  );
}
