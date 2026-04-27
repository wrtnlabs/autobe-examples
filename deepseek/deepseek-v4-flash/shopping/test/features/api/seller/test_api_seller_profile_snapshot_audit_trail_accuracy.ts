import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
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
 * Test seller profile snapshot retrieval with error handling validation.
 *
 * Validates that the seller profile snapshot retrieval endpoint correctly handles requests. Registers a seller with an explicit shop profile, verifies the profile is created accurately, and confirms that snapshot retrieval correctly rejects requests for non-existent snapshot IDs with an HTTP error.
 *
 * Full audit trail validation (register → edit profile → create snapshots → retrieve → verify historical values → verify chronological ordering → verify immutability) requires profile edit APIs that are not yet available in the current SDK function set. When profile edit APIs become available, this test should be expanded to:
 *
 * 1. Register seller with initial shop name and description.
 * 2. Edit profile (triggers Snapshot A creation preserving pre-edit state).
 * 3. Edit profile again (triggers Snapshot B creation).
 * 4. Retrieve each snapshot and verify preserved historical values.
 * 5. Verify chronological ordering of snapshots.
 * 6. Verify immutable retrieval (same snapshot always returns identical data).
 */
export async function test_api_seller_profile_snapshot_audit_trail_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // Register seller with initial shop profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: "Original Shop",
      shop_description: "Original description",
    },
  });
  typia.assert(seller);
  // Extract and guard the profile (which is possibly null per type definition
  // but always present for legitimately registered sellers)
  const profile = seller.profile;
  typia.assertGuard(profile!);
  TestValidator.equals(
    "shop name matches input",
    profile.shopName,
    "Original Shop",
  );
  TestValidator.equals(
    "shop description matches input",
    profile.shopDescription,
    "Original description",
  );
  // Since no profile edit SDK function is available to create snapshots,
  // verify that the snapshot retrieval endpoint correctly handles
  // non-existent snapshot IDs by returning an HTTP error.
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshot returns error",
    404,
    async () => {
      await api.functional.eCommerceMall.seller.profile.snapshots.at(
        sellerConnection,
        { snapshotId: nonExistentId },
      );
    },
  );
}
