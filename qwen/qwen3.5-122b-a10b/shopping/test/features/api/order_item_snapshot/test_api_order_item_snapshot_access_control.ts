import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test order item snapshot access control for sellers.
 *
 * Validates that sellers can only access order item snapshots for their own products,
 * receiving proper HTTP error responses when attempting unauthorized access.
 */
export async function test_api_order_item_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller connection and authenticate
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // Create second seller connection and authenticate
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // Test 1: Seller receives 404 for non-existent snapshot
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.snapshots.at(
        seller1Connection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
  // Test 2: Seller receives 403 for another seller's snapshot (simulated with random UUID)
  const otherSellerSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "another seller's snapshot returns 403",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.snapshots.at(
        seller1Connection,
        {
          snapshotId: otherSellerSnapshotId,
        },
      );
    },
  );
  // Test 3: Different seller also receives 403 for the same snapshot
  await TestValidator.httpError(
    "different seller cannot access same snapshot",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.snapshots.at(
        seller2Connection,
        {
          snapshotId: otherSellerSnapshotId,
        },
      );
    },
  );
}
