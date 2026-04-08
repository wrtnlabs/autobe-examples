import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
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

export async function test_api_order_item_snapshot_variant_option_scope_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify seller-scoped order item snapshot variant option lookup rejects mismatched hierarchy identifiers.
   *
   * This test authenticates a seller account and exercises the preserved snapshot variant option endpoint using deliberately unrelated UUIDs for the order item, snapshot, and variant option identifiers. It validates that the API refuses access when the requested variant option does not belong to the supplied snapshot or when the snapshot does not belong to the supplied order item, preserving immutable dispute-review isolation.
   *
   * 1. Register a seller account and authenticate a seller-specific connection.
   * 2. Call the snapshot variant option endpoint with a mismatched UUID chain.
   * 3. Validate that the server returns a not found error instead of unrelated data.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantOptionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched snapshot variant option scope should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItems.snapshots.variantOptions.at(
        sellerConnection,
        {
          orderItemId,
          orderItemSnapshotId,
          variantOptionId,
        },
      );
    },
  );
}
