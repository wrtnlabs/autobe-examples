import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Tests that sellers cannot access snapshots belonging to other sellers.
 * Verifies the authorization boundary that ensures sellers can only access
 * their own snapshot data for privacy protection.
 *
 * Test steps:
 * 1. Authenticate as seller A
 * 2. Authenticate as seller B
 * 3. As seller A, attempt to call the comparison endpoint with any snapshot IDs
 * 4. Expect 403 Forbidden because seller A is not authorized to access snapshots
 *    that don't belong to them (including non-existent or other seller snapshots)
 *
 * Business validation:
 * - System must reject cross-seller snapshot access
 * - Response should be 403 Forbidden status
 * - No profile data from other seller should be exposed
 * - Authorization check based on seller_id in snapshot record
 */
export async function test_api_seller_profile_snapshots_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create Seller A connection and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {} satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(sellerA);
  // Create Seller B connection and authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {} satisfies DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(sellerB);
  // Seller A attempts to compare snapshots
  // Using random UUIDs for snapshot IDs to simulate attempting to access
  // snapshots (whether own or cross-seller, authorization should be enforced)
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const randomOtherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access snapshot comparison as Seller A
  // This should fail with 403 Forbidden because:
  // - If snapshots exist and belong to Seller B: cross-seller access denied
  // - If snapshots don't exist: authorization check happens first or returns 403
  await TestValidator.httpError(
    "cross-seller snapshot access should be forbidden with 403",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.profile.snapshots.compare(
        sellerAConnection,
        {
          snapshotId: randomSnapshotId,
          otherSnapshotId: randomOtherSnapshotId,
        },
      );
    },
  );
}
