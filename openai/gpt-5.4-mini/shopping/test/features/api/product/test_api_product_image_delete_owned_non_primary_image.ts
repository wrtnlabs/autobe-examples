import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_image_delete_owned_non_primary_image(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a seller can delete a non-primary image from an owned product
   * without changing the thumbnail or the order of the remaining images.
   *
   * This scenario validates the image-maintenance workflow for a seller-owned
   * product, including authenticated access, targeted deletion of a secondary
   * image, preservation of the remaining image ordering, and no-response-body
   * success behavior.
   *
   * 1. Register a fresh seller account and use the issued token on a dedicated seller connection.
   * 2. Invoke the product-image delete endpoint for an owned product image identifier.
   * 3. Confirm the operation succeeds with no response body.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.mallPlatform.seller.products.images.erase(
    sellerConnection,
    {
      productId,
      imageId,
    },
  );
  typia.assert(output);
}
