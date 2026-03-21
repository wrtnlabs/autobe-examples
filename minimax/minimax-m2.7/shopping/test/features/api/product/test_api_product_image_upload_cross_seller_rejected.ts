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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_upload_cross_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // Step 2: Create a product as Seller A to establish ownership
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  // Step 3: Register and authenticate as Seller B (new seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // Step 4: Attempt to upload an image to Seller A's product using Seller B's authentication
  // Step 5: Assert response returns 403 Forbidden - cross-seller modification should be rejected
  await TestValidator.httpError(
    "cross-seller image upload rejected",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.products.images.create(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            imageUrls: [typia.random<string & tags.Format<"url">>()],
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      ),
  );
}
