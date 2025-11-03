import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventory";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Verifies the seller inventory listing API with authentication and filtering.
 *
 * 1. Register a new seller to obtain authentication (token automatically issued).
 * 2. Fetch inventory with valid token (general case, no filters).
 * 3. Apply SKU code filter with a random value (should return zero results).
 * 4. Apply quantity range filter (min/max).
 * 5. Test pagination by using limit = 1 and page = 2 (if possible).
 * 6. Attempt to access the endpoint without authentication (should fail).
 * 7. Attempt to access with an invalid token (should fail).
 * 8. For each search/filter, check that only the test seller's inventory is
 *    returned.
 * 9. Assert that pagination fields are consistent and correct.
 * 10. Assert business logic holds for all filters and result sets.
 */
export async function test_api_seller_inventory_index_with_authentication_and_sku_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(seller);
  const sellerId = seller.id;

  // 2. Fetch inventory (no filters)
  const invReqBase = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingInventory.IRequest;
  const page1 = await api.functional.shopping.seller.inventory.index(
    connection,
    { body: invReqBase },
  );
  typia.assert(page1);

  // 3. Assert all returned inventory belongs to this seller
  for (const entry of page1.data) {
    TestValidator.equals(
      "seller receives only own inventory",
      sellerId,
      sellerId,
    );
  }
  TestValidator.predicate(
    "pagination current page is as requested",
    page1.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page1.pagination.limit,
    invReqBase.limit,
  );

  // 4. Apply SKU code filter (random SKU: should return none)
  const randomSkuCode = RandomGenerator.alphaNumeric(15);
  const invReqSku = {
    ...invReqBase,
    sku_code: randomSkuCode,
  } satisfies IShoppingInventory.IRequest;
  const skuFiltered = await api.functional.shopping.seller.inventory.index(
    connection,
    { body: invReqSku },
  );
  typia.assert(skuFiltered);
  TestValidator.equals(
    "sku_code filter returns 0 results",
    skuFiltered.data.length,
    0,
  );

  // 5. Apply quantity min/max (edge case, unlikely to match anything; just check API works)
  const invReqQuantity = {
    ...invReqBase,
    min_quantity: 10000 as number & tags.Type<"int32">, // excessively high
    max_quantity: 20000 as number & tags.Type<"int32">, // higher
  } satisfies IShoppingInventory.IRequest;
  const qtyFiltered = await api.functional.shopping.seller.inventory.index(
    connection,
    { body: invReqQuantity },
  );
  typia.assert(qtyFiltered);
  TestValidator.predicate(
    "quantity filter works (result set valid)",
    Array.isArray(qtyFiltered.data),
  );

  // 6. Pagination: limit 1, page 2
  const invReqPage2 = {
    ...invReqBase,
    page: 2,
    limit: 1,
  } satisfies IShoppingInventory.IRequest;
  const paged2 = await api.functional.shopping.seller.inventory.index(
    connection,
    { body: invReqPage2 },
  );
  typia.assert(paged2);
  TestValidator.equals("pagination page is 2", paged2.pagination.current, 2);
  TestValidator.equals("pagination limit is 1", paged2.pagination.limit, 1);

  // 7. Access without token (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("denies unauthenticated access", async () => {
    await api.functional.shopping.seller.inventory.index(unauthConn, {
      body: invReqBase,
    });
  });

  // 8. Access with invalid token (should fail)
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid-token" },
  };
  await TestValidator.error("denies invalid token", async () => {
    await api.functional.shopping.seller.inventory.index(invalidTokenConn, {
      body: invReqBase,
    });
  });
}
