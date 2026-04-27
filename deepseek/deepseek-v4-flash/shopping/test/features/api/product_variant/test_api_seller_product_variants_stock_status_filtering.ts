import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test stock status filtering on the product variant listing endpoint.
 *
 * Verifies that the variant listing endpoint correctly responds to stock_status
 * filter parameters. Since variant creation and inventory management APIs are
 * not available, the test validates the endpoint returns empty results for all
 * filtering modes when a product has no variants.
 *
 * 1. Register a seller via authorize_seller_join.
 * 2. Create a product via generate_random_e_commerce_mall_seller_products_create.
 * 3. Call variants index with stock_status="in_stock" → empty page.
 * 4. Call variants index with stock_status="out_of_stock" → empty page.
 * 5. Call variants index without stock_status filter → empty page.
 */
export async function test_api_seller_product_variants_stock_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Test stock_status filtering
  // 3.1. Filter by in_stock - no variants exist, expect empty
  const inStockPage =
    await api.functional.eCommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          stock_status: "in_stock",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockPage);
  TestValidator.equals("in_stock result count", inStockPage.data.length, 0);
  // 3.2. Filter by out_of_stock - no variants exist, expect empty
  const outOfStockPage =
    await api.functional.eCommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          stock_status: "out_of_stock",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(outOfStockPage);
  TestValidator.equals(
    "out_of_stock result count",
    outOfStockPage.data.length,
    0,
  );
  // 3.3. No stock_status filter - no variants exist, expect empty
  const allPage =
    await api.functional.eCommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.equals("all variants result count", allPage.data.length, 0);
}
