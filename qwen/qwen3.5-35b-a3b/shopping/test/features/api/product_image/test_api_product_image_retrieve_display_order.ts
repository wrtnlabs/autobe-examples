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

export async function test_api_product_image_retrieve_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!secure",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller connection from token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 3. Create product with category_id
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100>
        >(),
        category_id,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Upload 3 images with different display_order values (0, 1, 2)
  const display_orders = [0, 1, 2] as const;
  const imageUrls = display_orders.map(
    (_, index) =>
      `https://example.com/images/image-${index}-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
  );
  for (const displayOrder of display_orders) {
    const imageUrl = imageUrls[displayOrder];
    await generate_random_ecommerce_mall_seller_products_images_create(
      authenticatedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: imageUrl,
          display_order: displayOrder,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  }
  // 5. Retrieve all images from product to get their IDs
  const uploadedImages = product.images;
  TestValidator.equals(
    "uploaded images count",
    uploadedImages.length,
    display_orders.length,
  );
  // 6. Sort images by display_order to get expected sequence
  const sortedImages = uploadedImages.sort((a, b) => a.display_order - b.display_order);
  // 7. Validate display_order uniqueness and sequence
  for (let i = 0; i < sortedImages.length; i++) {
    const expectedDisplayOrder = display_orders[i];
    TestValidator.equals(
      `image sequence ${i} display_order`,
      sortedImages[i].display_order,
      expectedDisplayOrder,
    );
  }
  // 8. Retrieve each image individually by image ID
  const retrievedImages: IEcommerceMallProductImage[] = [];
  for (const image of sortedImages) {
    const retrieved = await api.functional.ecommerceMall.products.images.at(
      connection,
      {
        productId: product.id,
        imageId: image.id,
      },
    );
    typia.assert(retrieved);
    retrievedImages.push(retrieved);
  }
  // 9. Validate each retrieved image preserves its display_order
  for (let i = 0; i < retrievedImages.length; i++) {
    const expectedDisplayOrder = sortedImages[i].display_order;
    TestValidator.equals(
      `retrieved image ${i} display_order`,
      retrievedImages[i].display_order,
      expectedDisplayOrder,
    );
  }
  // 10. Validate image with display_order=0 is the main thumbnail
  const mainThumbnail = retrievedImages.find((img) => img.display_order === 0);
  TestValidator.notEquals("main thumbnail exists", mainThumbnail, null);
  TestValidator.equals(
    "main thumbnail image_url",
    mainThumbnail?.image_url,
    sortedImages[0].image_url,
  );
  // 11. Validate product_id matches for all retrieved images
  for (const retrieved of retrievedImages) {
    TestValidator.equals(
      "retrieved product_id matches",
      retrieved.product.id,
      product.id,
    );
  }
  // 12. Validate image_urls match between product list and individual retrieval
  for (let i = 0; i < retrievedImages.length; i++) {
    TestValidator.equals(
      "image URL matches",
      retrievedImages[i].image_url,
      sortedImages[i].image_url,
    );
  }
}