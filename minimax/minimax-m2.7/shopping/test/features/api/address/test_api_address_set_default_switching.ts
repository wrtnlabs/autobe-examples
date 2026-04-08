import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_address_set_default_switching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first shipping address (non-default)
  const firstAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address is not default initially",
    firstAddress.is_default,
    false,
  );
  // 3. Create second shipping address (non-default)
  const secondAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address is not default initially",
    secondAddress.is_default,
    false,
  );
  // 4. Set first address as default
  const updatedFirstAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: firstAddress.id,
        body: {
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedFirstAddress);
  // 5. Verify first address is now default
  TestValidator.equals(
    "first address is now default",
    updatedFirstAddress.is_default,
    true,
  );
  // 6. Set second address as default
  const updatedSecondAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  // 7. Verify second address is now default
  TestValidator.equals(
    "second address is now default",
    updatedSecondAddress.is_default,
    true,
  );
  // 8. Confirm first address no longer has is_default: true
  TestValidator.equals(
    "first address no longer default after switching",
    updatedFirstAddress.is_default,
    false,
  );
  // 9. Verify only one address has is_default: true
  TestValidator.predicate(
    "only one address is default",
    updatedSecondAddress.is_default === true &&
      updatedFirstAddress.is_default === false,
  );
}
