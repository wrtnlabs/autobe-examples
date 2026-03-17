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

export async function test_api_customer_address_update_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and get authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create an initial shipping address
  const initialAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phone: "010-1111-2222",
          addressLine1: "123 Main St",
          addressLine2: null,
          city: "Seoul",
          state: "Seoul",
          postalCode: "04524",
          country: "KR",
          isDefault: false,
        },
      },
    );
  typia.assert(initialAddress);
  // 3. Update the address with completely changed values
  const updateBody = {
    recipientName: "Jane Smith",
    phone: "010-9999-8888",
    addressLine1: "456 Updated Ave",
    addressLine2: "Suite 200",
    city: "Busan",
    state: "Busan",
    postalCode: "48058",
    country: "KR",
    isDefault: false,
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 4. Validate identity fields remain unchanged
  TestValidator.equals(
    "address id unchanged",
    updatedAddress.id,
    initialAddress.id,
  );
  TestValidator.equals(
    "customerId unchanged",
    updatedAddress.customerId,
    initialAddress.customerId,
  );
  // 5. Validate all updated fields match submitted values
  TestValidator.equals(
    "recipientName updated",
    updatedAddress.recipientName,
    "Jane Smith",
  );
  TestValidator.equals("phone updated", updatedAddress.phone, "010-9999-8888");
  TestValidator.equals(
    "addressLine1 updated",
    updatedAddress.addressLine1,
    "456 Updated Ave",
  );
  TestValidator.equals(
    "addressLine2 updated",
    updatedAddress.addressLine2,
    "Suite 200",
  );
  TestValidator.equals("city updated", updatedAddress.city, "Busan");
  TestValidator.equals("state updated", updatedAddress.state, "Busan");
  TestValidator.equals(
    "postalCode updated",
    updatedAddress.postalCode,
    "48058",
  );
  TestValidator.equals("country updated", updatedAddress.country, "KR");
  TestValidator.equals(
    "isDefault remains false",
    updatedAddress.isDefault,
    false,
  );
  // 6. Validate deletedAt is null (address is still active)
  TestValidator.equals("deletedAt is null", updatedAddress.deletedAt, null);
  // 7. Validate updatedAt is newer than or equal to createdAt
  TestValidator.predicate(
    "updatedAt >= createdAt",
    new Date(updatedAddress.updatedAt) >= new Date(updatedAddress.createdAt),
  );
}
