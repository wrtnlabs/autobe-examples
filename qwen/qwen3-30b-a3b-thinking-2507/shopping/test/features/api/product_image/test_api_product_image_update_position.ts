import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";

export async function test_api_product_image_update_position(
  connection: api.IConnection,
): Promise<void> {
  // Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: "seller@example.com",
        password: "password123",
        name: "Test Seller",
        description: "Test seller description",
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create product
  const product: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {
        name: "Test Product",
        description: "Test product description",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
      } satisfies IEcommerceProduct.ICreate,
    });
  typia.assert(product);
  // Add two images to product
  const image1: IEcommerceProductImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://example.com/image1.jpg",
          position: 0,
          is_main: true,
        } satisfies IEcommerceProductImage.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(image1);
  const image2: IEcommerceProductImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://example.com/image2.jpg",
          position: 1,
          is_main: false,
        } satisfies IEcommerceProductImage.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(image2);
  // Update image position
  const updatedImage: IEcommerceProductImage =
    await api.functional.ecommerce.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image2.id,
        body: {
          image_url: image2.image_url,
          is_main: true,
          position: 0,
        } satisfies IEcommerceProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // Validate changes
  TestValidator.equals(
    "Updated image position should be 0",
    updatedImage.position,
    0,
  );
  TestValidator.equals(
    "Updated image should be main",
    updatedImage.is_main,
    true,
  );
  TestValidator.equals(
    "Initial main image position should now be 1",
    image1.position,
    1,
  );
  TestValidator.equals(
    "Initial main image should no longer be main",
    image1.is_main,
    false,
  );
}
