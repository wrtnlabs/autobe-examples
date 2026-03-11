import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_product_image_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Create product with valid category UUID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        base_price: typia.random<number & tags.Minimum<1>>(),
        category_id: categoryId,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload product image with display_order 0 (first image)
  const imageUrl = "https://example.com/images/test-product-image.jpg";
  await generate_random_ecommerce_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: imageUrl,
        display_order: 0,
      } satisfies IEcommerceMallProductImage.ICreate,
    },
  );
  // 4. Find the uploaded image from product.images array (no API call needed)
  const uploadedImage = product.images.find(
    (img: IEcommerceMallProductImage) => img.display_order === 0,
  )!;
  typia.assert(uploadedImage);
  // 5. Retrieve image as customer (no authentication required)
  const customerConnection: api.IConnection = { host: connection.host };
  const retrievedImage = await api.functional.ecommerceMall.products.images.at(
    customerConnection,
    {
      productId: product.id,
      imageId: uploadedImage.id,
    },
  );
  typia.assert(retrievedImage);
  // 6. Validate response fields
  TestValidator.equals(
    "image_url matches uploaded",
    retrievedImage.image_url,
    imageUrl,
  );
  TestValidator.equals(
    "display_order is 0 (first image)",
    retrievedImage.display_order,
    0,
  );
  TestValidator.equals(
    "product_id matches",
    retrievedImage.product.id,
    product.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    () => !isNaN(new Date(retrievedImage.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    () => !isNaN(new Date(retrievedImage.updated_at).getTime()),
  );
  TestValidator.predicate(
    "image has proper timestamps",
    new Date(retrievedImage.updated_at) >= new Date(retrievedImage.created_at),
  );
}
