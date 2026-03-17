import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a newly registered seller with no profile edits receives an empty snapshot history.
 *
 * This test verifies that profile snapshots are only created when profile edits occur,
 * and a newly registered seller with an unmodified profile has no snapshot history.
 * The test validates that the empty result set is returned correctly with proper
 * pagination metadata.
 */
export async function test_api_seller_profile_snapshot_empty_history_for_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account using utility function
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerJoinResult.token.access}`,
  };
  // 3. Get profile snapshots immediately after registration (no edits made)
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.profile.snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshotsResponse);
  // 4. Verify the data array is empty (no snapshots exist for new seller)
  TestValidator.equals(
    "new seller should have empty snapshot history",
    snapshotsResponse.data,
    [],
  );
  // 5. Verify pagination metadata
  TestValidator.equals(
    "records count should be 0",
    snapshotsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    snapshotsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    snapshotsResponse.pagination.limit > 0,
  );
}
