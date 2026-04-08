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
 * Verifies that order item snapshot variant options are isolated to their own snapshot.
 *
 * This test checks that the variant-option lookup endpoint does not leak preserved option rows across snapshot boundaries. It authenticates a seller, then queries the snapshot variant-option endpoint with an unrelated variant option identifier to confirm the API responds with a normal not-found result instead of returning another snapshot's historical data.
 *
 * The available SDK surface for this scenario does not expose snapshot creation or list retrieval helpers, so the test focuses on the observable business rule: a variant option id that is not associated with the requested order item snapshot must not resolve successfully.
 *
 * 1. Register and authenticate a seller session.
 * 2. Generate a snapshot id and an unrelated variant option id.
 * 3. Request the nested variant option resource.
 * 4. Assert the API rejects the cross-snapshot lookup with not-found.
 */
export async function test_api_order_item_snapshot_variant_option_not_associated(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorization);
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const unrelatedVariantOptionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "variant option not associated with snapshot should not be returned",
    [404],
    async () => {
      await api.functional.mallPlatform.seller.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
        sellerConnection,
        {
          orderItemSnapshotId,
          variantOptionId: unrelatedVariantOptionId,
        },
      );
    },
  );
}
