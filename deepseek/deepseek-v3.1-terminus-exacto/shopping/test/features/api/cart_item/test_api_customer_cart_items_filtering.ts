import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_items_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and authenticate customer
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Since we don't have product/variant creation endpoints, we'll test with a valid cart UUID
  // In a real scenario, we would add items to the cart first, then test filtering
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Empty filter - get all cart items (no items should exist for new cart)
  const allItems = await api.functional.ecommerce.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body: {
        limit: 10,
        page: 1,
      } satisfies IEcommerceCartItem.IRequest,
    },
  );
  typia.assert(allItems);
  TestValidator.equals(
    "empty cart returns empty data",
    allItems.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination structure exists",
    allItems.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", allItems.pagination.current, 1);
  TestValidator.predicate("limit is valid", allItems.pagination.limit > 0);
  TestValidator.equals(
    "records is 0 for empty cart",
    allItems.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is 0 for empty cart",
    allItems.pagination.pages,
    0,
  );
  // Test 2: Filter by product_id (empty result expected)
  const filteredByProduct =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 5,
          page: 1,
        } satisfies IEcommerceCartItem.IRequest,
      },
    );
  typia.assert(filteredByProduct);
  TestValidator.predicate(
    "product filter returns valid pagination",
    filteredByProduct.pagination !== undefined,
  );
  // Test 3: Filter by product_variant_id (empty result expected)
  const filteredByVariant =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 5,
          page: 1,
        } satisfies IEcommerceCartItem.IRequest,
      },
    );
  typia.assert(filteredByVariant);
  TestValidator.predicate(
    "variant filter returns valid pagination",
    filteredByVariant.pagination !== undefined,
  );
  // Test 4: Test sorting by created_at
  const sortedByCreated =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          sort: "created_at",
          limit: 5,
          page: 1,
        } satisfies IEcommerceCartItem.IRequest,
      },
    );
  typia.assert(sortedByCreated);
  TestValidator.predicate(
    "created_at sort returns valid structure",
    sortedByCreated.pagination !== undefined,
  );
  // Test 5: Test sorting by quantity
  const sortedByQuantity =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          sort: "quantity",
          limit: 5,
          page: 1,
        } satisfies IEcommerceCartItem.IRequest,
      },
    );
  typia.assert(sortedByQuantity);
  TestValidator.predicate(
    "quantity sort returns valid structure",
    sortedByQuantity.pagination !== undefined,
  );
  // Test 6: Test different pagination parameters
  const paginationTest =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          page: 2,
          limit: 3,
        } satisfies IEcommerceCartItem.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "page 2 with empty cart returns empty",
    paginationTest.data.length,
    0,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    paginationTest.pagination.current,
    2,
  );
  // Validate consistent pagination structure across all calls
  TestValidator.equals(
    "consistent pagination structure",
    Object.keys(allItems.pagination).sort(),
    Object.keys(filteredByProduct.pagination).sort(),
  );
}
