import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_address_multiple_storage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create first address (should become default automatically)
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address1);
  // First address should be default (auto-set since it's the first)
  TestValidator.equals("first address is default", address1.isDefault, true);
  TestValidator.equals(
    "address belongs to customer",
    address1.customer.id,
    customer.id,
  );
  // 3. Create second address with is_default = false
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(address2);
  // 4. Verify second address has is_default = false and first remains default
  TestValidator.equals(
    "second address is not default",
    address2.isDefault,
    false,
  );
  TestValidator.equals(
    "address2 belongs to customer",
    address2.customer.id,
    customer.id,
  );
  // 5. Create third address with is_default = true
  const address3 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(address3);
  // 6. Verify third address is now default, first and second have is_default = false
  TestValidator.equals("third address is default", address3.isDefault, true);
  TestValidator.equals(
    "address3 belongs to customer",
    address3.customer.id,
    customer.id,
  );
  // 7. Verify all three addresses exist and have different IDs
  TestValidator.notEquals(
    "address1 and address2 are different",
    address1.id,
    address2.id,
  );
  TestValidator.notEquals(
    "address2 and address3 are different",
    address2.id,
    address3.id,
  );
  TestValidator.notEquals(
    "address1 and address3 are different",
    address1.id,
    address3.id,
  );
  // 8. Verify all addresses belong to the same customer
  TestValidator.equals(
    "all addresses belong to same customer",
    address1.customer.id,
    address2.customer.id,
  );
  TestValidator.equals(
    "address3 also belongs to same customer",
    address2.customer.id,
    address3.customer.id,
  );
}
