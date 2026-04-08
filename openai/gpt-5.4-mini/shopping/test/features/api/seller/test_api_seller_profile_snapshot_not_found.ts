import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify seller profile snapshot lookup returns not found for a missing snapshot identifier.
   *
   * This test covers the restricted seller-only read path for immutable seller profile snapshots. It authenticates a seller with a dedicated connection, requests a snapshot using a random UUID that should not exist, and validates that the endpoint responds with a not found error.
   *
   * The scenario focuses on the missing-resource branch only. It does not create or modify seller profile data, and it ensures the lookup failure does not affect live storefront identity or snapshot history.
   *
   * 1. Authenticate as a seller using an isolated connection.
   * 2. Request a seller profile snapshot with a non-existent snapshot ID.
   * 3. Confirm the API rejects the request with a not found error.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const missingSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "seller profile snapshot should not be found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.sellerProfileSnapshots.at(
        sellerConnection,
        {
          sellerProfileSnapshotId: missingSnapshotId,
        },
      );
    },
  );
}
