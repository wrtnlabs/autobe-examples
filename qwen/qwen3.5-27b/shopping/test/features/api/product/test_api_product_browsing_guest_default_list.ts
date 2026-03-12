import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest user can browse products without authentication barriers.
 * The guest should be able to retrieve a paginated list of products with default
 * sorting (newest first) and default page size (20 items). Verify that the
 * response includes product summaries with essential information and pagination
 * metadata is correctly returned.
 */
export async function test_api_product_browsing_guest_default_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/products",
      referrer: "https://example.com/",
    },
  });
  // 2. Retrieve product list with default parameters (no filters)
  const response = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {} satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate product summary business logic for each product
  for (const product of response.data) {
    typia.assert(product);
    // Validate seller is approved and active (business rule)
    typia.assert(product.seller);
    TestValidator.equals(
      "seller approval status is approved",
      product.seller.approval_status,
      "approved",
    );
    TestValidator.equals(
      "seller status is active",
      product.seller.status,
      "active",
    );
    // Validate category exists
    typia.assert(product.category);
    // Validate availability logic: if variantCount > 0, check available flag makes sense
    if (product.variantCount > 0) {
      TestValidator.predicate(
        "product with variants has valid availability flag",
        typeof product.available === "boolean",
      );
    }
    // Validate price is positive
    TestValidator.predicate(
      "product base price is positive",
      product.basePrice > 0,
    );
  }
  // 5. Validate that data array length matches pagination
  TestValidator.equals(
    "data length matches expected",
    response.data.length,
    Math.min(response.pagination.limit, response.pagination.records),
  );
}
