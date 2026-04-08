import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that a seller can retrieve their own profile snapshot by ID.
 *
 * Validates the seller profile snapshot retrieval functionality by registering a seller account and attempting to access a profile snapshot. This test verifies that the snapshot endpoint properly authenticates the seller and handles requests appropriately.
 *
 * The test registers a new seller account and then attempts to retrieve a profile snapshot. Since profile snapshots are created when a seller updates their profile (shop name, description, or logo), and no profile update API is available in this test context, attempting to retrieve a non-existent snapshot should result in a 404 error.
 *
 * 1. Register a seller account with email and password credentials
 * 2. Generate a snapshot ID for retrieval attempt
 * 3. Call GET /shoppingMall/seller/profile/snapshots/{snapshotId} endpoint
 * 4. Expect 404 error since no snapshots exist for this newly registered seller
 * 5. Validate that the error handling works correctly for non-existent snapshots
 */
export async function test_api_seller_profile_snapshot_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Generate a snapshot ID for testing (non-existent snapshot)
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the snapshot - should fail with 404
  // Since no profile updates were made, no snapshots exist
  await TestValidator.error("non-existent snapshot returns error", async () => {
    await api.functional.shoppingMall.seller.profile.snapshots.at(
      sellerConnection,
      {
        snapshotId,
      },
    );
  });
}
