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
 * Test that retrieving a non-existent seller profile snapshot returns 404 Not Found.
 * Authenticated sellers attempting to access snapshots that don't exist should receive
 * a 404 response without information leakage about snapshot existence.
 */
export async function test_api_seller_profile_snapshot_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Generate a valid UUID that doesn't exist in the database
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve non-existent snapshot and verify 404
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.profile_snapshots.at(
        sellerConnection,
        { snapshotId: nonExistentSnapshotId },
      );
    },
  );
}
