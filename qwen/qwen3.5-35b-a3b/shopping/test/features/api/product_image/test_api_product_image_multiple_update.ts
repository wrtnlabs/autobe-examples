import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_images_upload_images } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_upload_images";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_multiple_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Get existing product from catalog
  const productList = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(productList);
  // Find a product owned by this seller
  let targetProduct: IEcommerceMallProduct.ISummary | undefined;
  if (productList.data.length > 0) {
    // Use the first product from the list
    targetProduct = productList.data[0];
  } else {
    // If no products exist, we cannot proceed - this is a test setup issue
    throw new Error("No products available in the system");
  }
  const productId = targetProduct.id;
  // 3. Upload initial image to the product
  const initialImageUrl = typia.random<string & tags.Format<"uri">>();
  const initialImage =
    await api.functional.ecommerceMall.seller.products.images.uploadImages(
      sellerConnection,
      {
        productId,
        body: {
          image_url: (initialImageUrl satisfies string as string),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // 4. Update both display_order and image_url in a single operation
  const newImageUrl = typia.random<string & tags.Format<"uri">>();
  const newDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const updatedImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId,
        imageId: initialImage.id,
        body: {
          display_order: newDisplayOrder,
          image_url: (newImageUrl satisfies string as string),
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate multiple field update
  TestValidator.equals(
    "display_order updated to new value",
    updatedImage.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "image_url updated to new value",
    updatedImage.image_url,
    (newImageUrl satisfies string as string),
  );
  TestValidator.notEquals(
    "original image URL was different",
    updatedImage.image_url,
    (initialImageUrl satisfies string as string),
  );
  TestValidator.notEquals(
    "original display_order was different",
    updatedImage.display_order,
    initialImage.display_order,
  );
  // 6. Verify timestamp was updated
  TestValidator.predicate(
    "updated_at timestamp is set",
    updatedImage.updated_at !== undefined,
  );
}