import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_seller_product_image_reordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Create product with multiple images
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Minimum<0.01> & tags.Type<"uint32">
        >(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Verify product has at least 2 images
  if (product.images.length < 2) {
    throw new Error("Product must have at least 2 images for ordering test");
  }
  // 4. Reorder images - move position 1 to position 0
  const configs: IEcommerceProductImage.IConfig[] = [
    {
      image_url: product.images[1].image_url,
      is_main: false,
      position: 0,
    },
    {
      image_url: product.images[0].image_url,
      is_main: false,
      position: 1,
    },
    {
      image_url: product.images[2].image_url,
      is_main: product.images[2].is_main,
      position: 2,
    },
  ];
  // 5. Apply new image order
  const updatedProduct =
    await api.functional.ecommerce.seller.products.images.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          configs,
          page: 1,
          limit: 100,
        } satisfies IEcommerceProductImage.IRequest,
      },
    );
  typia.assert(updatedProduct);
  // 6. Verify exactly one main image
  const mainImages = updatedProduct.data.filter((img) => img.is_main);
  TestValidator.equals("Exactly one main image", mainImages.length, 1);
  // 7. Verify position sequence (0, 1, 2,...)
  updatedProduct.data.forEach((img, index) => {
    TestValidator.equals(
      `Image position matches at index ${index}`,
      img.position,
      index,
    );
  });
  // 8. Verify main image was not the one we moved
  const originalMainImage = product.images.find((img) => img.is_main);
  TestValidator.equals(
    "Main image correctly identified after reorder",
    mainImages[0].id,
    originalMainImage?.id,
  );
}
