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

export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload three images and record their sort orders
  const image1 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // Record original sort orders before reorder
  const originalSortOrders = [
    image1.sort_order,
    image2.sort_order,
    image3.sort_order,
  ];
  // Verify original sort orders are ascending (0, 1, 2)
  TestValidator.predicate(
    "initial sort orders are 0, 1, 2",
    () =>
      originalSortOrders[0] === 0 &&
      originalSortOrders[1] === 1 &&
      originalSortOrders[2] === 2,
  );
  // 4. Reorder images: new sequence [image3, image1, image2]
  // image3 becomes thumbnail (sort_order 0), image1 gets sort_order 1, image2 gets sort_order 2
  const reorderResult =
    await api.functional.eCommerceMall.seller.products.images.reorder(
      sellerConnection,
      {
        productId: product.id,
        body: {
          values: [image3.id, image1.id, image2.id],
        } satisfies IECommerceMallProductImage.IReorder,
      },
    );
  typia.assert(reorderResult);
  // 5. Verify the returned image has sort_order 0 (thumbnail position)
  TestValidator.equals(
    "reordered thumbnail has sort_order 0",
    reorderResult.sort_order,
    0,
  );
  // 6. Verify the thumbnail is the image that was previously last (image3)
  TestValidator.equals(
    "thumbnail image is the one previously at sort_order 2 (image3)",
    reorderResult.id,
    image3.id,
  );
  // 7. Verify the image URL remained unchanged (only sort_order changed)
  TestValidator.equals(
    "image URL preserved after reorder",
    reorderResult.url,
    image3.url,
  );
  // 8. Verify sort_order changed from the original value
  TestValidator.notEquals(
    "sort_order changed from original for image3",
    reorderResult.sort_order,
    originalSortOrders[2],
  );
}
