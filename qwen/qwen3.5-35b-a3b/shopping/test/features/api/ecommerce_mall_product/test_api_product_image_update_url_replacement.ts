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

export async function test_api_product_image_update_url_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product using seller connection
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<100000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload initial image with placeholder URL using seller connection
  const initialImage = typia.assert<IEcommerceMallProductImage>(
    await api.functional.ecommerceMall.seller.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          image_url: "https://placeholder.example.com/initial-image.jpg",
          display_order: 0,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    ),
  );
  typia.assert(initialImage);
  // 4. Update image URL to new valid URI using seller connection
  const newImageUrl = "https://cdn.example.com/products/new-product-image.png";
  const updatedImage = typia.assert<IEcommerceMallProductImage>(
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: initialImage.id,
        body: {
          image_url: newImageUrl,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    ),
  );
  typia.assert(updatedImage);
  // 5. Validate image_url was updated to new URL
  TestValidator.equals(
    "image_url updated to new URL",
    updatedImage.image_url,
    newImageUrl,
  );
  // 6. Validate display_order remained unchanged
  TestValidator.equals(
    "display_order preserved after update",
    updatedImage.display_order,
    initialImage.display_order,
  );
  // 7. Validate updated_at reflects modification time (later than created_at)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedImage.updated_at).getTime() >
      new Date(updatedImage.created_at).getTime(),
  );
  // 8. Validate image id is preserved
  TestValidator.equals(
    "image id preserved after update",
    updatedImage.id,
    initialImage.id,
  );
  // 9. Validate product reference is preserved
  TestValidator.equals(
    "product reference preserved after update",
    updatedImage.product.id,
    product.id,
  );
  // 10. Validate image_url format is valid URI
  TestValidator.predicate(
    "image_url is valid URI format",
    /^(https?:\/\/)\[^\s]+$/i.test(updatedImage.image_url),
  );
}