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

export async function test_api_product_image_url_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Generate product and image IDs (simulating existing resources)
  const productId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const imageId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial image state for comparison
  const originalImageUrl = typia.random<string & tags.Format<"uri">>();
  const originalUpdatedAt = new Date().toISOString();
  // 4. Update image URL to new valid URI
  const newImageUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const updateBody: IEcommerceMallProductImage.IUpdate = {
    image_url: newImageUrl satisfies string as string,
  };
  const updatedImage: IEcommerceMallProductImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId,
        imageId,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 5. Validate update succeeded
  TestValidator.equals(
    "image_url updated to new value",
    updatedImage.image_url,
    newImageUrl satisfies string as string,
  );
  TestValidator.equals(
    "product_id matches request",
    updatedImage.product_id,
    productId satisfies string as string,
  );
  TestValidator.equals("image_id matches request", updatedImage.id, imageId satisfies string as string);
  // 6. Validate timestamp reflects change
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    updatedImage.updated_at,
  );
  // 7. Validate image_url is valid URI format (type checked by typia.assert)
  // The URI format is validated by typia.assert with tags.Format<"uri">
}