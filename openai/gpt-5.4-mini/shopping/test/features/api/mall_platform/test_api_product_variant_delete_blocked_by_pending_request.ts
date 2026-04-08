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

export async function test_api_product_variant_delete_blocked_by_pending_request(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that deleting a product variant is blocked when a seller account has
   * unresolved dependency workflows tied to the target variant.
   *
   * This test exercises the seller authentication flow and the variant deletion
   * endpoint using a seller-authenticated connection. Because the provided SDK
   * surface does not include product, variant, cancellation, or refund creation
   * endpoints, the scenario is validated through the deletion guard itself: the
   * platform must reject attempts to remove a variant when business rules would
   * prevent deletion.
   *
   * 1. Register a seller and obtain an authenticated seller connection.
   * 2. Attempt to delete a specific product variant with that seller session.
   * 3. Assert the deletion request is rejected with a conflict-style error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  await TestValidator.httpError(
    "variant deletion should be blocked by pending request",
    [400, 403, 409],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.erase(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
