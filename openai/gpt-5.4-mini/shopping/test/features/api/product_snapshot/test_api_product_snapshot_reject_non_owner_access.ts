import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
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
 * Reject non-owner access to a seller product snapshot.
 *
 * Verifies that the seller-scoped snapshot retrieval endpoint enforces ownership boundaries. The scenario establishes two distinct seller accounts and confirms that a different seller cannot retrieve another seller's preserved product snapshot through cross-account identifiers.
 *
 * Because the available API surface in this test scope exposes only seller registration and snapshot retrieval, the test validates the authorization boundary directly by attempting to read a snapshot with a non-owner seller connection and expecting the platform to reject the request.
 *
 * 1. Register two separate sellers with distinct authenticated connections.
 * 2. Attempt to read a product snapshot through the second seller's connection using seller-scoped product and snapshot identifiers.
 * 3. Assert that the API rejects the request with forbidden or not-found semantics.
 */
export async function test_api_product_snapshot_reject_non_owner_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-owner seller cannot access another seller's product snapshot",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.seller.products.snapshots.at(
        sellerBConnection,
        {
          productId,
          snapshotId,
        },
      );
    },
  );
}
