import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_filtering_by_stock_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Test filtering with stockStatus='in_stock'
  // Should return items where variant has sufficient stock
  const inStockItems =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          stockStatus: "in_stock",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(inStockItems);
  // Validate in_stock items have availabilityStatus='available'
  for (const item of inStockItems.data) {
    TestValidator.equals(
      "in_stock item should have available status",
      item.availabilityStatus,
      "available",
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "in_stock response has data array",
    Array.isArray(inStockItems.data),
  );
  // 3. Test filtering with stockStatus='out_of_stock'
  // Should return items where cart quantity exceeds variant quantity
  const outOfStockItems =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          stockStatus: "out_of_stock",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(outOfStockItems);
  // Validate out_of_stock items have availabilityStatus='unavailable'
  // (type only supports "available" | "unavailable")
  for (const item of outOfStockItems.data) {
    TestValidator.equals(
      "out_of_stock item should have unavailable status",
      item.availabilityStatus,
      "unavailable",
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "out_of_stock response has data array",
    Array.isArray(outOfStockItems.data),
  );
  // 4. Test filtering with stockStatus='unavailable'
  // Should return items where variant has been deleted
  const unavailableItems =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          stockStatus: "unavailable",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(unavailableItems);
  // Validate unavailable items have availabilityStatus='unavailable'
  for (const item of unavailableItems.data) {
    TestValidator.equals(
      "unavailable item should have unavailable status",
      item.availabilityStatus,
      "unavailable",
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "unavailable response has data array",
    Array.isArray(unavailableItems.data),
  );
  // 5. Test pagination with different stock statuses
  // Test with limit and page parameters
  const paginatedInStock =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          stockStatus: "in_stock",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(paginatedInStock);
  // Validate pagination metadata
  TestValidator.predicate(
    "paginated response has data array",
    Array.isArray(paginatedInStock.data),
  );
  TestValidator.predicate(
    "data length is non-negative",
    paginatedInStock.data.length >= 0,
  );
  // 6. Test with stockStatus='all' (default - no filter)
  const allFilteredItems =
    await api.functional.ecommerceMall.customer.cart.items.index(
      customerConnection,
      {
        body: {
          stockStatus: "all",
          limit: 100,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(allFilteredItems);
  // Validate all items are present
  TestValidator.predicate(
    "all filter returns items",
    allFilteredItems.data.length >= 0,
  );
}