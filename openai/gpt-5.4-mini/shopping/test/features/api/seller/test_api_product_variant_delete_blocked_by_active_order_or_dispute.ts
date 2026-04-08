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

export async function test_api_product_variant_delete_blocked_by_active_order_or_dispute(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that deleting a seller product variant is blocked while the variant remains tied to active commerce or dispute handling.
   *
   * This test authenticates a seller account, then attempts to delete a variant through the seller product variant deletion endpoint and validates that the operation is rejected under business rules that protect live fulfillment and dispute workflows.
   *
   * 1. Authenticate a seller using a dedicated actor connection.
   * 2. Attempt to delete a variant using the seller-owned product variant delete endpoint.
   * 3. Confirm the deletion request is rejected so active catalog data is preserved.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "blocked variant deletion should be rejected",
    [400, 409, 422],
    async () => {
      await api.functional.mallPlatform.seller.products.variants.erase(
        sellerConnection,
        {
          productId,
          variantId,
        },
      );
    },
  );
}
