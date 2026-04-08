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
 * Test that listing variants for a product without any variants returns an empty list with correct pagination.
 *
 * Validates the complete product variant listing flow when a product has no variants. Ensures that the API correctly returns an empty variant list with proper pagination metadata (records = 0, pages = 0) instead of throwing an error. This confirms that products without variants are valid but unpurchasable, and sellers can still view the empty variant list to understand they need to add variants to make the product purchasable.
 *
 * Special attention is given to verifying that the pagination metadata correctly reflects zero total records and that the response is successful (200 OK) rather than an error condition.
 *
 * 1. Seller authenticates via registration (join) with randomized credentials.
 * 2. Seller creates a product with name, description, and base price using the generation utility.
 * 3. Do NOT create any variants for this product (product remains unpurchasable per business rules).
 * 4. Seller calls PATCH /shoppingMall/seller/products/{productId}/variants with empty request body.
 * 5. Validates response contains empty data array with correct pagination (records = 0, pages = 0).
 */
export async function test_api_product_variant_list_empty_when_no_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product without any variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. List variants for product with no variants
  const variants =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(variants);
  // 4. Validate empty variant list with correct pagination
  TestValidator.equals("variant list is empty", variants.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    variants.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    variants.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is one",
    variants.pagination.current,
    1,
  );
}
