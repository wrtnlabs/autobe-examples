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
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_images_list_with_multiple_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create a new connection with the seller's token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 2. Create a new product listing
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Add three images to the product (in sequence)
  const imageUrls = [
    "https://example.com/images/product-image-1.jpg",
    "https://example.com/images/product-image-2.jpg",
    "https://example.com/images/product-image-3.jpg",
  ];
  // First image (will become main thumbnail with display_order=0)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      authenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrls: [imageUrls[0]],
        },
      },
    );
  typia.assert(firstImage);
  // Second image
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      authenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrls: [imageUrls[1]],
        },
      },
    );
  typia.assert(secondImage);
  // Third image
  const thirdImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      authenticatedConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrls: [imageUrls[2]],
        },
      },
    );
  typia.assert(thirdImage);
  // 4. Call GET /ecommerceMall/products/{productId}/images without authentication
  const imagesResponse =
    await api.functional.ecommerceMall.products.images.list(connection, {
      productId: product.id,
    });
  typia.assert(imagesResponse);
  // 5. Validate response structure and pagination
  TestValidator.equals(
    "pagination exists",
    imagesResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "records count matches 3 images",
    imagesResponse.pagination.records,
    3,
  );
  // 6. Validate images are ordered by display_order ascending (0, 1, 2)
  TestValidator.equals("data array has 3 items", imagesResponse.data.length, 3);
  const firstImageResponse = imagesResponse.data[0];
  const secondImageResponse = imagesResponse.data[1];
  const thirdImageResponse = imagesResponse.data[2];
  // 7. Verify first image has display_order=0 and is main thumbnail
  TestValidator.equals(
    "first image display_order is 0",
    firstImageResponse.display_order,
    0,
  );
  // 8. Verify each image has required fields
  TestValidator.predicate(
    "first image has id",
    firstImageResponse.id.length > 0,
  );
  TestValidator.predicate(
    "first image has image_url",
    firstImageResponse.image_url.length > 0,
  );
  TestValidator.predicate(
    "first image has display_order",
    typeof firstImageResponse.display_order === "number",
  );
  TestValidator.predicate(
    "first image has created_at",
    firstImageResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "first image has updated_at",
    firstImageResponse.updated_at.length > 0,
  );
  TestValidator.predicate(
    "second image has id",
    secondImageResponse.id.length > 0,
  );
  TestValidator.predicate(
    "second image has image_url",
    secondImageResponse.image_url.length > 0,
  );
  TestValidator.predicate(
    "second image has display_order",
    typeof secondImageResponse.display_order === "number",
  );
  TestValidator.predicate(
    "third image has id",
    thirdImageResponse.id.length > 0,
  );
  TestValidator.predicate(
    "third image has image_url",
    thirdImageResponse.image_url.length > 0,
  );
  TestValidator.predicate(
    "third image has display_order",
    typeof thirdImageResponse.display_order === "number",
  );
  // 9. Validate display_order sequence (0, 1, 2)
  TestValidator.equals(
    "second image display_order is 1",
    secondImageResponse.display_order,
    1,
  );
  TestValidator.equals(
    "third image display_order is 2",
    thirdImageResponse.display_order,
    2,
  );
}
