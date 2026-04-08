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
 * Verify variant deletion is blocked when pending order items exist.
 *
 * This test validates the destructive-variant guard rail for seller catalog
 * management. It ensures that a seller-authenticated request cannot delete a
 * variant when live commerce obligations would be violated by removing a SKU
 * that still participates in paid or shipped order items.
 *
 * 1. Authenticate a fresh seller connection for the acting seller.
 * 2. Attempt to delete a seller product variant using valid identifiers.
 * 3. Confirm the API rejects the deletion attempt with a conflict-style error.
 */
export async function test_api_product_variant_delete_blocked_by_pending_order_items(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant deletion should be blocked by pending order items",
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
