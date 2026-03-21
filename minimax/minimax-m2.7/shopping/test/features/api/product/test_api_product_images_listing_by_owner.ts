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

/**
 * Test that a seller can successfully retrieve a paginated list of product images for their own product.
 *
 * This scenario validates the primary success path where a seller with approved status queries their
 * product's image gallery. The test verifies that:
 * 1. The response returns pagination metadata and data array
 * 2. Images are sorted by display_order ascending with first image at display_order=0 as main thumbnail
 * 3. Each image record contains id, image_url, display_order, and created_at fields
 * 4. Default pagination works (page=1, limit=20)
 * 5. Custom pagination parameters can be applied
 *
 * Precondition: Seller must be authenticated with approved status and have created a product with multiple images uploaded.
 */
export async function test_api_product_images_listing_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload multiple images to the product (at least 5 images for pagination testing)
  const imageUrls = ArrayUtil.repeat(
    5,
    (i) =>
      `https://storage.example.com/images/product_${product.id}_image_${i}.jpg`,
  );
  const createdImages: IEcommerceMallProductImage[] = [];
  for (const imageUrl of imageUrls) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: { imageUrls: [imageUrl as string & tags.Format<"url">] },
        },
      );
    typia.assert(image);
    createdImages.push(image);
  }
  // 4. Test default pagination (page=1, limit=20)
  const defaultResponse =
    await api.functional.ecommerceMall.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductImage.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    defaultResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(defaultResponse.data),
    true,
  );
  TestValidator.equals("image count matches", defaultResponse.data.length, 5);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count is 5",
    defaultResponse.pagination.records,
    5,
  );
  TestValidator.equals("pages is 1", defaultResponse.pagination.pages, 1);
  // 5. Validate image data structure and sorting
  for (let i = 0; i < defaultResponse.data.length; i++) {
    const image = defaultResponse.data[i];
    // Validate required fields exist
    TestValidator.equals(`image ${i} has id`, image.id !== undefined, true);
    TestValidator.equals(
      `image ${i} has image_url`,
      image.image_url !== undefined,
      true,
    );
    TestValidator.equals(
      `image ${i} has display_order`,
      image.display_order !== undefined,
      true,
    );
    TestValidator.equals(
      `image ${i} has created_at`,
      image.created_at !== undefined,
      true,
    );
  }
  // Validate sorting by display_order ascending
  TestValidator.predicate("images sorted by display_order ascending", () => {
    for (let i = 1; i < defaultResponse.data.length; i++) {
      if (
        defaultResponse.data[i].display_order <
        defaultResponse.data[i - 1].display_order
      ) {
        return false;
      }
    }
    return true;
  });
  // Validate first image has display_order=0 (main thumbnail)
  TestValidator.equals(
    "first image display_order is 0",
    defaultResponse.data[0].display_order,
    0,
  );
  // 6. Test custom pagination with limit=2
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: 2,
        } satisfies IEcommerceMallProductImage.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response has 2 images",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals(
    "paginated records is still 5",
    paginatedResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "paginated pages is 3",
    paginatedResponse.pagination.pages,
    3,
  );
  // 7. Test sorting with descending order
  const descResponse =
    await api.functional.ecommerceMall.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sortBy: "display_order",
          order: "desc",
        } satisfies IEcommerceMallProductImage.IRequest,
      },
    );
  typia.assert(descResponse);
  // Validate descending order
  TestValidator.predicate("images sorted by display_order descending", () => {
    for (let i = 1; i < descResponse.data.length; i++) {
      if (
        descResponse.data[i].display_order >
        descResponse.data[i - 1].display_order
      ) {
        return false;
      }
    }
    return true;
  });
}
