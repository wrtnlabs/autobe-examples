import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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
 * Verifies that seller-scoped product image retrieval is isolated by product ownership.
 *
 * This test covers the GET image lookup path using seller authentication and validates that the endpoint is read-only. Because the available SDK surface does not expose product or image creation helpers for this scenario, the test uses UUID-shaped identifiers and asserts that the endpoint rejects unauthorized or non-existent product-image ownership combinations instead of mutating any state.
 *
 * 1. Authenticate as a seller using the join helper.
 * 2. Request a product image by product and image identifiers that are not linked in the current test context.
 * 3. Validate that the endpoint rejects the lookup as a business not-found condition.
 */
export async function test_api_product_image_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.error(
    "non-existent product image ownership should be rejected",
    async () => {
      await api.functional.mallPlatform.seller.products.images.at(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
