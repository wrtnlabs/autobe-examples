import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
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
 * Test seller profile snapshot retrieval success path.
 *
 * Validates that a seller can successfully retrieve their own profile snapshot by ID. The test verifies the complete snapshot retrieval workflow including seller authentication and snapshot data validation.
 *
 * The scenario tests the primary success path for snapshot retrieval, ensuring that the immutable audit trail is properly maintained and accessible to authorized sellers.
 *
 * 1. Create and authenticate a seller account via join
 * 2. Generate a snapshot ID for retrieval
 * 3. Retrieve the seller profile snapshot using the snapshot ID
 * 4. Validate the snapshot contains all required fields (shop_name, shop_description, logo_url, created_at)
 * 5. Validate the snapshot includes the seller account reference with summary data
 * 6. Verify the snapshot data structure conforms to IEcommerceSellerSnapshot type
 */
export async function test_api_seller_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Generate snapshot ID for retrieval
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve seller profile snapshot
  const snapshot = await api.functional.ecommerce.seller.snapshots.at(
    sellerConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot business logic - seller reference matches
  TestValidator.equals(
    "seller reference in snapshot",
    snapshot.seller.id,
    seller.id,
  );
}
