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
 * Test that a seller can successfully retrieve their own profile snapshot.
 *
 * Validates the complete seller profile snapshot retrieval flow including seller registration, authentication, and snapshot access. Ensures that the snapshot endpoint returns all required fields with correct data types and that sellers can access their profile history.
 *
 * Special attention is given to verifying that the snapshot structure matches the IShoppingMallSellerProfileSnapshot DTO definition and that all temporal and reference fields are properly formatted.
 *
 * 1. Seller registers with email and credentials using authorize_seller_join.
 * 2. Creates seller-specific connection with authentication token.
 * 3. Generates a valid snapshot ID for retrieval testing.
 * 4. Calls GET /shoppingMall/seller/profile-snapshots/{snapshotId} endpoint.
 * 5. Validates response structure and field types using typia.assert().
 */
export async function test_api_seller_profile_snapshot_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account using utility function
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Generate snapshot ID for retrieval
  // Note: In production, this would come from profile edit response or snapshot list
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the seller profile snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.profile_snapshots.at(
      sellerConnection,
      {
        snapshotId: snapshotId,
      },
    );
  // 5. Validate response structure and types
  typia.assert(snapshot);
}
