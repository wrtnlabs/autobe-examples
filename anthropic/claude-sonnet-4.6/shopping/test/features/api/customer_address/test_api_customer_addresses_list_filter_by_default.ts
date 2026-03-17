import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
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

export async function test_api_customer_addresses_list_filter_by_default(
  connection: api.IConnection,
): Promise<void> {
  // ── Customer A setup ──────────────────────────────────────────────────────
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // Create 1 default address and 2 non-default addresses for Customer A
  const defaultAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      { body: { isDefault: true } },
    );
  typia.assert(defaultAddress);
  const nonDefaultAddress1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      { body: { isDefault: false } },
    );
  typia.assert(nonDefaultAddress1);
  const nonDefaultAddress2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      { body: { isDefault: false } },
    );
  typia.assert(nonDefaultAddress2);
  // ── Test isDefault = true filter ──────────────────────────────────────────
  const defaultFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerAConnection,
      {
        body: {
          isDefault: true,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultFilterResult);
  // Exactly 1 address should be returned
  TestValidator.equals(
    "isDefault=true filter: exactly 1 result",
    defaultFilterResult.data.length,
    1,
  );
  // That address must have isDefault = true
  TestValidator.predicate(
    "isDefault=true filter: returned address has isDefault=true",
    defaultFilterResult.data[0]!.isDefault === true,
  );
  // Pagination: records = 1, pages = 1
  TestValidator.equals(
    "isDefault=true filter: pagination records",
    defaultFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "isDefault=true filter: pagination pages",
    defaultFilterResult.pagination.pages,
    1,
  );
  // ── Test isDefault = false filter ─────────────────────────────────────────
  const nonDefaultFilterResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerAConnection,
      {
        body: {
          isDefault: false,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(nonDefaultFilterResult);
  // 2 non-default addresses should be returned
  TestValidator.equals(
    "isDefault=false filter: exactly 2 results",
    nonDefaultFilterResult.data.length,
    2,
  );
  // All returned addresses must have isDefault = false
  TestValidator.predicate(
    "isDefault=false filter: all addresses have isDefault=false",
    nonDefaultFilterResult.data.every((addr) => addr.isDefault === false),
  );
  // Pagination: records = 2
  TestValidator.equals(
    "isDefault=false filter: pagination records",
    nonDefaultFilterResult.pagination.records,
    2,
  );
  // ── Edge case: no default address set (Customer B) ────────────────────────
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Create 2 non-default addresses for Customer B
  const bAddr1 = await generate_random_shopping_mall_customer_addresses_create(
    customerBConnection,
    { body: { isDefault: false } },
  );
  typia.assert(bAddr1);
  const bAddr2 = await generate_random_shopping_mall_customer_addresses_create(
    customerBConnection,
    { body: { isDefault: false } },
  );
  typia.assert(bAddr2);
  // Filter isDefault = true should return empty
  const emptyDefaultResult =
    await api.functional.shoppingMall.customer.addresses.index(
      customerBConnection,
      {
        body: {
          isDefault: true,
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(emptyDefaultResult);
  TestValidator.equals(
    "edge case: no default – empty data array",
    emptyDefaultResult.data.length,
    0,
  );
  TestValidator.equals(
    "edge case: no default – records = 0",
    emptyDefaultResult.pagination.records,
    0,
  );
}
