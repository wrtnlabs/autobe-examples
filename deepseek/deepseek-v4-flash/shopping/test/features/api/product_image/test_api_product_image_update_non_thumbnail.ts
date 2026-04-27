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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_update_non_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload first image (becomes thumbnail - sort_order: 0)
  const firstImage =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals("first image is thumbnail", firstImage.sort_order, 0);
  // 4. Upload second image (non-thumbnail - sort_order: 1)
  const secondImage =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image is non-thumbnail",
    secondImage.sort_order,
    1,
  );
  // 5. Update the non-thumbnail image URL
  const newUrl = typia.random<string & tags.Format<"uri">>();
  const updatedImage =
    await api.functional.eCommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: {
          url: newUrl,
        } satisfies IECommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 6. Verify updated image properties
  TestValidator.equals("image id preserved", updatedImage.id, secondImage.id);
  TestValidator.equals(
    "sort_order preserved as non-thumbnail",
    updatedImage.sort_order,
    1,
  );
  TestValidator.equals("url updated to new value", updatedImage.url, newUrl);
  TestValidator.equals(
    "product association preserved",
    updatedImage.product.id,
    product.id,
  );
  // 7. Verify the thumbnail image's sort_order remains 0 (unchanged)
  TestValidator.equals(
    "thumbnail sort_order still 0",
    firstImage.sort_order,
    0,
  );
  // 8. Verify updated_at timestamp has been refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedImage.updated_at,
    secondImage.updated_at,
  );
}
