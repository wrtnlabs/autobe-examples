import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_address_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and get an authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Step 2: Create a new shipping address with isDefault=true
  const createdAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(createdAddress);
  // Step 3: Retrieve the address by ID
  const address = await api.functional.shoppingMall.customer.addresses.at(
    customerConnection,
    { addressId: createdAddress.id },
  );
  typia.assert(address);
  // Step 4: Validate all fields match the created address and business rules
  TestValidator.equals("address id matches", address.id, createdAddress.id);
  TestValidator.equals(
    "recipientName matches",
    address.recipientName,
    createdAddress.recipientName,
  );
  TestValidator.equals("phone matches", address.phone, createdAddress.phone);
  TestValidator.equals(
    "addressLine1 matches",
    address.addressLine1,
    createdAddress.addressLine1,
  );
  TestValidator.equals("city matches", address.city, createdAddress.city);
  TestValidator.equals("state matches", address.state, createdAddress.state);
  TestValidator.equals(
    "postalCode matches",
    address.postalCode,
    createdAddress.postalCode,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    createdAddress.country,
  );
  TestValidator.equals("isDefault is true", address.isDefault, true);
  TestValidator.equals(
    "customerId matches authenticated customer",
    address.customerId,
    authorized.id,
  );
  TestValidator.equals("deletedAt is null", address.deletedAt, null);
}
