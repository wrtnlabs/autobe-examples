import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_customer_addresses_filter_by_default_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a default address (is_default = true)
  const defaultAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      { body: { is_default: true } },
    );
  typia.assert(defaultAddress);
  // 3. Create a non-default address (is_default = false)
  const nonDefaultAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      { body: { is_default: false } },
    );
  typia.assert(nonDefaultAddress);
  // 4. Filter by isDefault = true — only default address should be returned
  const defaultOnly =
    await api.functional.eCommerceMall.customer.addresses.index(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(defaultOnly);
  TestValidator.equals(
    "only default address returned when filtering by isDefault=true",
    defaultOnly.data.length,
    1,
  );
  TestValidator.equals(
    "default address has isDefault=true",
    defaultOnly.data[0].isDefault,
    true,
  );
  // 5. Filter by isDefault = false — only non-default address should be returned
  const nonDefaultOnly =
    await api.functional.eCommerceMall.customer.addresses.index(
      customerConnection,
      { body: { isDefault: false } },
    );
  typia.assert(nonDefaultOnly);
  TestValidator.equals(
    "only non-default address returned when filtering by isDefault=false",
    nonDefaultOnly.data.length,
    1,
  );
  TestValidator.equals(
    "non-default address has isDefault=false",
    nonDefaultOnly.data[0].isDefault,
    false,
  );
  // 6. No filter — both addresses returned, sorted with default first
  const allAddresses =
    await api.functional.eCommerceMall.customer.addresses.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(allAddresses);
  TestValidator.equals(
    "both addresses returned without filter",
    allAddresses.data.length,
    2,
  );
  TestValidator.equals(
    "default address appears first",
    allAddresses.data[0].isDefault,
    true,
  );
  TestValidator.equals(
    "non-default address appears second",
    allAddresses.data[1].isDefault,
    false,
  );
}
