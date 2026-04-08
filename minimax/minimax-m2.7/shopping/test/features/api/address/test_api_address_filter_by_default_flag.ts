import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
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

export async function test_api_address_filter_by_default_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Create default address
  const defaultAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        } satisfies Partial<IEcommerceMallShippingAddress.ICreate>,
      },
    );
  typia.assert(defaultAddress);
  // 3. Create non-default addresses (created after default, so they should appear second)
  const nonDefaultAddress1 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        } satisfies Partial<IEcommerceMallShippingAddress.ICreate>,
      },
    );
  typia.assert(nonDefaultAddress1);
  const nonDefaultAddress2 =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        } satisfies Partial<IEcommerceMallShippingAddress.ICreate>,
      },
    );
  typia.assert(nonDefaultAddress2);
  // 4. Test filtering with isDefault=true
  const defaultOnlyResult =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          isDefault: true,
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(defaultOnlyResult);
  // Validate: only default address should be returned
  TestValidator.equals(
    "default addresses count",
    defaultOnlyResult.data.length,
    1,
  );
  TestValidator.equals(
    "default address isDefault true",
    defaultOnlyResult.data[0].isDefault,
    true,
  );
  TestValidator.equals(
    "default address ID matches",
    defaultOnlyResult.data[0].id,
    defaultAddress.id,
  );
  // 5. Test filtering with isDefault=false
  const nonDefaultResult =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          isDefault: false,
        } satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(nonDefaultResult);
  // Validate: only non-default addresses should be returned
  TestValidator.equals(
    "non-default addresses count",
    nonDefaultResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all non-default addresses have isDefault false",
    nonDefaultResult.data.every((addr) => addr.isDefault === false),
  );
  // 6. Test without filter - verify default-first ordering
  const allAddressesResult =
    await api.functional.ecommerceMall.customer.addresses.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallShippingAddress.IRequest,
      },
    );
  typia.assert(allAddressesResult);
  // Validate: total count should be 3
  TestValidator.equals(
    "total addresses count",
    allAddressesResult.data.length,
    3,
  );
  // Validate: first address should be default
  TestValidator.equals(
    "first address is default",
    allAddressesResult.data[0].isDefault,
    true,
  );
  TestValidator.equals(
    "first address ID matches default",
    allAddressesResult.data[0].id,
    defaultAddress.id,
  );
}
