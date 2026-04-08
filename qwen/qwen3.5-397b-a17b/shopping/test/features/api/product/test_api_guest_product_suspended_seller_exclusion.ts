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
 * Test that products from suspended sellers are automatically excluded from guest product browsing results.
 *
 * Validates the complete product browsing flow for guest users, ensuring that products from sellers with non-approved status are automatically filtered out at the query level. This is a critical security and compliance requirement to prevent unauthorized sellers from displaying products to customers.
 *
 * The test verifies that seller approval status filtering works correctly across all filter combinations including category filtering, search queries, price range constraints, and stock availability filters. All returned products must have seller.approvalStatus = 'approved'.
 *
 * 1. Guest registers using device fingerprint to obtain authentication tokens.
 * 2. Guest requests product list without any filters and validates all sellers are approved.
 * 3. Guest requests products with category filter and validates seller exclusion.
 * 4. Guest requests products with search query and validates seller exclusion.
 * 5. Guest requests products with price range filter and validates seller exclusion.
 * 6. Guest requests in-stock products only and validates seller exclusion.
 */
export async function test_api_guest_product_suspended_seller_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Test basic product listing - all sellers must be approved
  const basicProducts = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(basicProducts);
  // Validate all products have approved sellers
  for (const product of basicProducts.data) {
    TestValidator.equals(
      `product ${product.id} seller status`,
      product.seller.approvalStatus,
      "approved",
    );
  }
  // 3. Test with category filter
  const categoryProducts =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: {
        page: 1,
        limit: 50,
        categoryId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(categoryProducts);
  for (const product of categoryProducts.data) {
    TestValidator.equals(
      `category filtered product ${product.id} seller status`,
      product.seller.approvalStatus,
      "approved",
    );
  }
  // 4. Test with search query
  const searchProducts = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 50,
        search: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchProducts);
  for (const product of searchProducts.data) {
    TestValidator.equals(
      `search filtered product ${product.id} seller status`,
      product.seller.approvalStatus,
      "approved",
    );
  }
  // 5. Test with price range filter
  const priceFilteredProducts =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: {
        page: 1,
        limit: 50,
        minPrice: 1000,
        maxPrice: 100000,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceFilteredProducts);
  for (const product of priceFilteredProducts.data) {
    TestValidator.equals(
      `price filtered product ${product.id} seller status`,
      product.seller.approvalStatus,
      "approved",
    );
  }
  // 6. Test with inStock filter
  const inStockProducts =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: {
        page: 1,
        limit: 50,
        inStock: true,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(inStockProducts);
  for (const product of inStockProducts.data) {
    TestValidator.equals(
      `in-stock product ${product.id} seller status`,
      product.seller.approvalStatus,
      "approved",
    );
  }
  // 7. Test combined filters
  const combinedProducts =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: {
        page: 1,
        limit: 50,
        search: RandomGenerator.name(),
        minPrice: 500,
        maxPrice: 50000,
        inStock: true,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(combinedProducts);
  for (const product of combinedProducts.data) {
    TestValidator.equals(
      `combined filter product ${product.id} seller status`,
      product.seller.approvalStatus,
      "approved",
    );
  }
}
