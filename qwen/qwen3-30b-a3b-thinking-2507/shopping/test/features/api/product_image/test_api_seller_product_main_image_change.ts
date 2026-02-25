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

export async function test_api_seller_product_main_image_change(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  if (!product || product.images.length < 2) {
    throw new Error(
      "Product must have at least two images for main image change test",
    );
  }
  const currentMain = product.images.find((img) => img.is_main);
  if (!currentMain) {
    throw new Error("Product must have a main image before changing");
  }
  const otherImage = product.images.find((img) => !img.is_main);
  if (!otherImage) {
    throw new Error("Product must have at least one non-main image");
  }
  const configs = product.images.map((img: IEcommerceProductImage) => {
    if (img.id === currentMain.id) {
      return {
        image_url: img.image_url,
        is_main: false,
        position: 1,
      };
    } else if (img.id === otherImage.id) {
      return {
        image_url: img.image_url,
        is_main: true,
        position: 0,
      };
    } else {
      return {
        image_url: img.image_url,
        is_main: img.is_main,
        position: img.position,
      };
    }
  });
  const response = await api.functional.ecommerce.seller.products.images.index(
    sellerConnection,
    {
      productId: product.id,
      body: { configs },
    },
  );
  typia.assert(response);
  const updatedImages = response.data;
  const mainImages = updatedImages.filter((img) => img.is_main);
  TestValidator.equals("exactly one main image", mainImages.length, 1);
  TestValidator.equals(
    "new main image is correct",
    mainImages[0].id,
    otherImage.id,
  );
}
