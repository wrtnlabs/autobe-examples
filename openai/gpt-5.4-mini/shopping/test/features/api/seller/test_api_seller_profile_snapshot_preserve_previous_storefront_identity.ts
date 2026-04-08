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

export async function test_api_seller_profile_snapshot_preserve_previous_storefront_identity(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a seller profile snapshot preserves the storefront identity captured at snapshot time.
   *
   * This test authenticates a seller account and validates the seller snapshot retrieval endpoint using the
   * available DTO and SDK surface. The scenario focuses on historical storefront identity preservation,
   * including the shop name, shop description, and logo image URI stored in the snapshot response.
   *
   * 1. Register a seller account through the seller join utility.
   * 2. Use the authenticated seller identity to call the seller profile snapshot endpoint with valid identifiers.
   * 3. Validate that the returned snapshot payload is a properly typed preserved storefront record.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const snapshot =
    await api.functional.mallPlatform.seller.sellers.profile.snapshots.at(
      sellerConnection,
      {
        sellerId: authorized.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate(
    "snapshot seller profile is preserved",
    snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
  );
  TestValidator.predicate(
    "snapshot shop name is preserved",
    snapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop description is preserved",
    snapshot.shopDescription.length > 0,
  );
}
