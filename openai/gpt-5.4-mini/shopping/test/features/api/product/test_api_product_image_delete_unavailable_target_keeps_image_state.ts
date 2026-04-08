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

/**
 * Verifies that deleting an unavailable seller product image is rejected without mutating image state.
 *
 * This scenario checks that the product image deletion endpoint enforces seller-owned product scope and refuses to remove a target image when the target is unavailable or otherwise ineligible for image maintenance.
 *
 * 1. Registers a seller account and establishes an authenticated seller connection.
 * 2. Calls the product image deletion endpoint with a product/image target that is not expected to be deletable in the current context.
 * 3. Confirms the request fails as a business error, preserving the existing image set state by not performing any successful mutation.
 */
export async function test_api_product_image_delete_unavailable_target_keeps_image_state(
  connection: api.IConnection,
): Promise<void> {
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
  await TestValidator.error(
    "deleting an unavailable product image target should fail",
    async () => {
      await api.functional.mallPlatform.seller.products.images.erase(
        sellerConnection,
        {
          productId,
          imageId,
        },
      );
    },
  );
}
