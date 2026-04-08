import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test scenario for a seller successfully retrieving their own product image.
 * Setup: Authenticate as seller, create a product in a category, upload an image to the product.
 * Execute: Call GET to retrieve the specific product image.
 * Validate: Response returns IEcommerceMallProductImage with correct id, imageUrl, displayOrder (should be 0 for first image), product reference, and timestamps.
 */
export async function test_api_product_image_seller_own_product_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin connection and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Setup Seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "https://example.com/seller",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 3. Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        categoryId: category.id,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  // 4. Upload image to product
  const image =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(image);
  // 5. Retrieve the product image using the GET endpoint
  const retrievedImage = await api.functional.ecommerceMall.products.images.at(
    sellerConnection,
    {
      productId: product.id,
      productImageId: image.id,
    },
  );
  typia.assert(retrievedImage);
  // 6. Validate business logic (relationships, not types - typia already validated types)
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "imageUrl matches",
    retrievedImage.imageUrl,
    image.imageUrl,
  );
  TestValidator.equals("displayOrder is 0", retrievedImage.displayOrder, 0);
  TestValidator.equals(
    "product.id matches",
    retrievedImage.product.id,
    product.id,
  );
}
