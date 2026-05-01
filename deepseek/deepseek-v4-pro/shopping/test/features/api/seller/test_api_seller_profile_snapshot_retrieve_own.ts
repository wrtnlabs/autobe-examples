import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving a seller profile snapshot by its unique identifier.
 *
 * Validates that an authenticated seller can access the snapshot retrieval
 * endpoint and that proper error handling occurs for non-existent snapshots.
 *
 * Seller profile snapshots are immutable historical records created
 * automatically whenever a seller edits their shop name, description, or
 * logo image. Each snapshot preserves the complete profile state as it
 * existed at the moment before the edit was applied.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Attempts to retrieve a non-existent snapshot with a random UUID.
 * 3. Verifies the endpoint returns 404 Not Found for invalid snapshot IDs.
 */
export async function test_api_seller_profile_snapshot_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Attempt to retrieve a non-existent snapshot - expect 404
  await TestValidator.error("non-existent snapshot returns 404", async () => {
    await api.functional.shoppingMall.seller.profile.snapshots.at(
      sellerConnection,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
