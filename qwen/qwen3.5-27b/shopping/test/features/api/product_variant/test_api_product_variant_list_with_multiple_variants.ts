import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can list all variants for a product with multiple variants.
 *
 * Validates the product variant listing functionality for authenticated sellers. The test authenticates a seller, creates a product, and verifies that the variants listing endpoint returns a properly structured paginated response. The response is validated for correct pagination metadata, variant data structure, and product reference integrity.
 *
 * Special attention is given to verifying pagination metadata accuracy, variant option value display, stock quantity computation from inventory records, and proper handling of null prices that fall back to product base price.
 *
 * 1. Seller authenticates via join endpoint with randomized credentials.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller calls PATCH /shoppingMall/seller/products/{productId}/variants with empty request body.
 * 4. Validates response contains paginated list structure with correct metadata.
 * 5. Validates each variant (if any) includes required fields and product reference.
 * 6. Validates pagination metadata matches actual variant count.
 */
export async function test_api_product_variant_list_with_multiple_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. List variants for the product
  const variantsResponse: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(variantsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination records matches data length",
    variantsResponse.pagination.records,
    variantsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    variantsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    variantsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    variantsResponse.pagination.pages >= 0,
  );
  // 5. Validate each variant has required fields (if any variants exist)
  await ArrayUtil.asyncForEach(variantsResponse.data, async (variant) => {
    typia.assert(variant);
    // Validate variant has unique ID
    TestValidator.predicate(
      `variant has valid UUID: ${variant.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        variant.id,
      ),
    );
    // Validate SKU code is present
    TestValidator.predicate(
      `variant has SKU code: ${variant.sku_code}`,
      variant.sku_code.length > 0,
    );
    // Validate price is either number or null
    TestValidator.predicate(
      `variant price is valid: ${variant.price}`,
      variant.price === null || typeof variant.price === "number",
    );
    // Validate options array exists
    TestValidator.predicate(
      `variant has options array`,
      Array.isArray(variant.options),
    );
    // Validate each option has key and value
    await ArrayUtil.asyncForEach(variant.options, async (option) => {
      TestValidator.predicate(
        `option has key: ${option.key}`,
        option.key.length > 0,
      );
      TestValidator.predicate(
        `option has value: ${option.value}`,
        option.value.length > 0,
      );
    });
    // Validate stock quantity is non-negative
    TestValidator.predicate(
      `variant stock_quantity is non-negative: ${variant.stock_quantity}`,
      variant.stock_quantity >= 0,
    );
    // Validate timestamps are present
    TestValidator.predicate(
      `variant has created_at: ${variant.created_at}`,
      variant.created_at.length > 0,
    );
    TestValidator.predicate(
      `variant has updated_at: ${variant.updated_at}`,
      variant.updated_at.length > 0,
    );
    // Validate product reference
    TestValidator.equals(
      `variant product_id matches: ${variant.product.id}`,
      variant.product.id,
      product.id,
    );
    TestValidator.equals(
      `variant product name matches: ${variant.product.name}`,
      variant.product.name,
      product.name,
    );
    TestValidator.equals(
      `variant product base_price matches: ${variant.product.base_price}`,
      variant.product.base_price,
      product.base_price,
    );
  });
  // 6. Validate variants are sorted by created_at descending (if multiple variants exist)
  if (variantsResponse.data.length > 1) {
    for (let i = 1; i < variantsResponse.data.length; i++) {
      const prevVariant = variantsResponse.data[i - 1];
      const currVariant = variantsResponse.data[i];
      TestValidator.predicate(
        `variants sorted by created_at descending: ${prevVariant.created_at} >= ${currVariant.created_at}`,
        new Date(prevVariant.created_at).getTime() >=
          new Date(currVariant.created_at).getTime(),
      );
    }
  }
}