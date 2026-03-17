import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test edge case where product has no variants.
 * 1. Seller registers and logs in
 * 2. Seller creates a product without adding any variants
 * 3. List variants for the product
 * 4. Verify response returns empty data array with pagination showing zero records
 */
export async function test_api_product_variant_empty_list_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Seller connection now has token from authorize function
  TestValidator.predicate("seller registered", sellerAuth.id !== undefined);
  TestValidator.equals(
    "approval status",
    sellerAuth.approval_status,
    "PENDING",
  );
  // 2. Create product without variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate("product created", product.id !== undefined);
  TestValidator.equals("product name matches", product.name, product.name);
  // 3. List variants for the product (should be empty)
  const variantList: IPageIShoppingMallProductVariant.ISummary =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(variantList);
  // 4. Validate empty variant list response structure
  TestValidator.equals(
    "variant data array is empty",
    variantList.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records count",
    variantList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    variantList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    variantList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", variantList.pagination.limit, 20);
}
