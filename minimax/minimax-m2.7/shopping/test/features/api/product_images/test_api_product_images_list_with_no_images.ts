import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test retrieving images for a product that has no images.
 *
 * This test validates the edge case where a product exists but has zero images.
 * The test authenticates as a seller, creates a product listing without uploading
 * any images, and then calls GET /ecommerceMall/products/{productId}/images as a
 * guest (no authentication). The client should display a placeholder image in this
 * scenario.
 *
 * Test flow:
 * 1. Authenticate as a seller
 * 2. Create a product with no images
 * 3. Call GET /ecommerceMall/products/{productId}/images as guest
 * 4. Validate response data array is empty
 * 5. Validate pagination shows records=0
 */
export async function test_api_product_images_list_with_no_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product with no images
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a guest connection (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // 4. Call GET /ecommerceMall/products/{productId}/images as guest
  const imageList = await api.functional.ecommerceMall.products.images.list(
    guestConnection,
    { productId: product.id },
  );
  typia.assert(imageList);
  // 5. Validate response data array is empty
  TestValidator.equals("data array should be empty", imageList.data, []);
  // 6. Validate pagination shows records=0
  TestValidator.equals("records should be 0", imageList.pagination.records, 0);
  TestValidator.equals("pages should be 0", imageList.pagination.pages, 0);
}
