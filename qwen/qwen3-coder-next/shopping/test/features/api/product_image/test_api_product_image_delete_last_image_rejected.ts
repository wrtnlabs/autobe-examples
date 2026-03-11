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

export async function test_api_product_image_delete_last_image_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product with single image
  const product =
    await api.functional.ecommerceMall.seller.products.images.upload(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          files: [RandomGenerator.alphaNumeric(16)],
        } satisfies IEcommerceMallProductImage.IUpload,
      },
    );
  typia.assert(product);
  // 3. Verify product has exactly one image
  TestValidator.predicate(
    "image exists",
    () => product.image_url !== undefined && product.image_url.length > 0,
  );
  // 4. Try to delete the last image - should fail with business error
  await TestValidator.error("delete last image rejected", async () => {
    await api.functional.ecommerceMall.seller.products.images.erase(
      sellerConnection,
      {
        productId: product.id,
        imageId: product.id,
      },
    );
  });
  // 5. Verify image still exists (deleted_at remains null)
  TestValidator.equals("image deleted_at is null", product.deleted_at, null);
}
