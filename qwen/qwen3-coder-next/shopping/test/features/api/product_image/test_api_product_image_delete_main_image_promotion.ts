import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function test_api_product_image_delete_main_image_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product with main image and secondary image
  const product =
    await api.functional.ecommerceMall.seller.products.images.upload(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          files: [
            RandomGenerator.alphaNumeric(16), // main image
            RandomGenerator.alphaNumeric(16), // secondary image
          ],
        } satisfies IEcommerceMallProductImage.IUpload,
      },
    );
  typia.assert(product);
  // 3. Verify initial state (first image is main)
  const mainImageId = product.id;
  const secondaryImageId = typia.random<string & tags.Format<"uuid">>();
  // 4. Delete main image
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.product_id,
      imageId: mainImageId,
    },
  );
  // 5. Verify promotion: secondary image becomes main
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.images.upload(
      sellerConnection,
      {
        productId: product.product_id,
        body: {
          files: [secondaryImageId],
        } satisfies IEcommerceMallProductImage.IUpload,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "secondary image promoted to main",
    updatedProduct.is_main,
    true,
  );
  TestValidator.equals(
    "new main image has sort_order 1",
    updatedProduct.sort_order,
    1,
  );
}
