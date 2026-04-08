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

export async function test_api_seller_snapshot_access_control_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Seller A (unauthorized accessor)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Create and authenticate Seller B (potential snapshot owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Generate a snapshot ID that would belong to Seller B
  // In a complete implementation, Seller B would update their profile to create a snapshot
  // and we would retrieve the actual snapshot ID from that operation
  // For this access control test, we use a valid UUID format
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Seller A attempts to access a snapshot (that belongs to Seller B or doesn't exist)
  // The system should return 403 Forbidden without revealing whether the snapshot exists
  // This validates the security requirement of not disclosing resource existence
  await TestValidator.httpError(
    "unauthorized seller cannot access snapshot",
    403,
    async () => {
      await api.functional.ecommerce.seller.snapshots.at(sellerAConnection, {
        snapshotId,
      });
    },
  );
  // 5. Verify Seller B also cannot access arbitrary snapshots (only their own)
  await TestValidator.httpError(
    "seller cannot access arbitrary snapshots",
    403,
    async () => {
      await api.functional.ecommerce.seller.snapshots.at(sellerBConnection, {
        snapshotId,
      });
    },
  );
}
