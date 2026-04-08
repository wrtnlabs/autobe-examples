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
 * Test that a seller cannot retrieve another seller's profile snapshot (authorization failure).
 *
 * Validates the authorization enforcement for seller profile snapshot access by attempting cross-seller access. This test ensures that profile snapshots remain private to their owning seller and that unauthorized access attempts are properly rejected with HTTP 403 Forbidden status.
 *
 * The test creates two separate seller accounts, generates a profile snapshot for the first seller, and then attempts to access that snapshot using the second seller's authentication credentials. This validates the security boundary between sellers in the platform.
 *
 * 1. Register first seller account (seller A) using authorize_seller_join utility
 * 2. Register second seller account (seller B) using authorize_seller_join utility
 * 3. Create separate authenticated connections for each seller
 * 4. Generate a valid UUID to use as the snapshot ID for seller A's profile
 * 5. Attempt to retrieve seller A's snapshot using seller B's authenticated connection
 * 6. Verify that the API returns HTTP 403 Forbidden status code
 * 7. Confirm that cross-seller snapshot access is properly denied
 */
export async function test_api_seller_profile_snapshot_access_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller (owner of the snapshot)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Register second seller (attempting unauthorized access)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 3. Generate a snapshot ID that would belong to seller A
  // In a real scenario, this would be obtained from seller A's profile update
  // For this test, we use a randomly generated UUID to simulate a snapshot ID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to access seller A's snapshot using seller B's connection
  // This should fail with HTTP 403 Forbidden
  await TestValidator.httpError(
    "seller B cannot access seller A's profile snapshot",
    403,
    async () =>
      await api.functional.shoppingMall.seller.profile.snapshots.at(
        sellerBConnection,
        { snapshotId },
      ),
  );
}
