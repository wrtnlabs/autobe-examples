import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_admin_customer_address_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create customer connection and authenticate, record customer UUID
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 3. Create a shipping address as the customer (isDefault = true)
  const addressBody = {
    recipientName: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    addressLine1: RandomGenerator.paragraph({ sentences: 1 }),
    addressLine2: null,
    city: RandomGenerator.alphabets(8),
    state: RandomGenerator.alphabets(6),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "US" as string & tags.MinLength<2> & tags.MaxLength<2>,
    isDefault: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    { body: addressBody },
  );
  typia.assert(address);
  const addressId = address.id;
  // 4. As admin, retrieve the address detail
  const retrieved =
    await api.functional.shoppingMall.admin.customers.addresses.at(
      adminConnection,
      {
        customerId,
        addressId,
      },
    );
  typia.assert(retrieved);
  // 6. Assert id matches
  TestValidator.equals("address id matches", retrieved.id, addressId);
  // 7. Assert customerId matches
  TestValidator.equals("customerId matches", retrieved.customerId, customerId);
  // 8. Assert isDefault is true
  TestValidator.equals("isDefault is true", retrieved.isDefault, true);
  // 9. Assert deletedAt is null
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
  // 10. Assert address fields match input
  TestValidator.equals(
    "recipientName matches",
    retrieved.recipientName,
    addressBody.recipientName,
  );
  TestValidator.equals("phone matches", retrieved.phone, addressBody.phone);
  TestValidator.equals(
    "addressLine1 matches",
    retrieved.addressLine1,
    addressBody.addressLine1,
  );
  TestValidator.equals("city matches", retrieved.city, addressBody.city);
  TestValidator.equals("state matches", retrieved.state, addressBody.state);
  TestValidator.equals(
    "postalCode matches",
    retrieved.postalCode,
    addressBody.postalCode,
  );
  TestValidator.equals(
    "country matches",
    retrieved.country,
    addressBody.country,
  );
}
