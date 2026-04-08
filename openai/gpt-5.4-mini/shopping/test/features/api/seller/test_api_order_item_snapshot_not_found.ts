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

/**
 * Verify that a missing seller order item snapshot lookup returns not found.
 *
 * Confirms that requesting a non-existent order item snapshot identifier from
 * the seller-scoped lookup endpoint fails safely with a not-found outcome and
 * does not expose historical purchase data.
 *
 * 1. Authenticate as a seller using an isolated connection.
 * 2. Request a deliberately missing order item snapshot identifier and expect a
 *    not-found error.
 * 3. Repeat the same lookup to confirm the failure remains read-only and
 *    consistent for the same missing identifier.
 */
export async function test_api_order_item_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const missingOrderItemSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "missing order item snapshot should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItemSnapshots.at(
        sellerConnection,
        {
          orderItemSnapshotId: missingOrderItemSnapshotId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "repeated lookup of missing order item snapshot should still return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.orderItemSnapshots.at(
        sellerConnection,
        {
          orderItemSnapshotId: missingOrderItemSnapshotId,
        },
      );
    },
  );
}
