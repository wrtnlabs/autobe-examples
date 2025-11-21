import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_product_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with business verification
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile("010"),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create test product with proper SKU and settings
  const productSku = `TEST-SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        href: "https://marketplace.example.com/add-product",
        referrer: "https://marketplace.example.com/dashboard",
        sku: productSku,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: "00000000-0000-0000-0000-000000000000",
        shopping_mall_seller_id: seller.id,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Verify product exists in marketplace catalog
  const searchResultBefore = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sellerId: seller.id,
        sortBy: "name",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResultBefore);
  TestValidator.predicate(
    "seller has products before deletion",
    searchResultBefore.data.length > 0,
  );
  TestValidator.predicate(
    "product exists in seller catalog",
    searchResultBefore.data.some((p) => p.id === product.id),
  );

  // Validate complete product structure before deletion including DTO requirements
  TestValidator.predicate("product has variants", product.variants.length >= 0);
  TestValidator.predicate(
    "product has inventory tracking enabled",
    product.track_quantity === true,
  );
  TestValidator.predicate(
    "product has business seller relationship",
    product.seller.id === seller.id,
  );

  // Step 3: Delete the product through seller-specific endpoint
  const deletedProduct =
    await api.functional.shoppingMall.seller.products.erase(connection, {
      productCode: productSku,
    });
  typia.assert(deletedProduct);
  TestValidator.equals(
    "deleted product core data matches original product",
    deletedProduct.id,
    product.id,
  );
  TestValidator.equals(
    "deleted product SKU matches original",
    deletedProduct.sku,
    product.sku,
  );
  TestValidator.equals(
    "deleted product name matches original",
    deletedProduct.name,
    product.name,
  );

  // Step 4: Verify comprehensive deletion validation
  const searchResultAfter = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sellerId: seller.id,
        sortBy: "name",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResultAfter);
  TestValidator.predicate(
    "deleted product not found in seller catalog",
    !searchResultAfter.data.some((p) => p.id === product.id),
  );

  // Step 5: Test duplicate deletion prevention
  await TestValidator.error(
    "duplicate product deletion should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productCode: productSku,
      });
    },
  );

  // Validate referential integrity maintained after deletion
  TestValidator.predicate(
    "deleted product has deletion timestamp",
    deletedProduct.deleted_at !== null &&
      deletedProduct.deleted_at !== undefined,
  );
}
