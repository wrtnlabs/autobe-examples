import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
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

export async function test_api_product_image_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller account with proper connection isolation
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: typia.random<IEcommerceSeller.IJoin>(),
  });
  typia.assert(seller1);
  // Create second seller account with proper connection isolation
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: typia.random<IEcommerceSeller.IJoin>(),
  });
  typia.assert(seller2);
  // Create product for first seller
  const product1 = await generate_random_ecommerce_seller_products_create(
    seller1Connection,
    {
      body: typia.random<IEcommerceProduct.ICreate>(),
    },
  );
  typia.assert(product1);
  // Add image to first seller's product
  const image1 = await generate_random_ecommerce_seller_products_images_create(
    seller1Connection,
    {
      params: { productId: product1.id },
      body: typia.random<IEcommerceProductImage.ICreate>(),
    },
  );
  typia.assert(image1);
  // Attempt unauthorized deletion using second seller's credentials
  await TestValidator.error("unauthorized image deletion", async () => {
    await api.functional.ecommerce.seller.products.images.erase(
      seller2Connection,
      {
        productId: product1.id,
        imageId: image1.id,
      },
    );
  });
}
