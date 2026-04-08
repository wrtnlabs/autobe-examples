import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create } from "../../../generate/generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create";
import { prepare_random_mall_platform_order_item_snapshot_variant_option } from "../../../prepare/prepare_random_mall_platform_order_item_snapshot_variant_option";

export async function test_api_order_item_snapshot_variant_option_snapshot_scoped(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate strict snapshot scoping for preserved order item variant option rows.
   *
   * This test covers the immutable read model for order item snapshot variant options.
   * It verifies that an administrator can read a variant option only through the
   * snapshot that owns it, and that attempting to resolve the same option through a
   * different snapshot context returns a normal not-found error instead of leaking
   * unrelated data.
   *
   * 1. Authenticate as an administrator.
   * 2. Create two distinct order item snapshot variant option rows under two different
   *    snapshot identifiers.
   * 3. Retrieve each row through its own parent snapshot to confirm the happy path.
   * 4. Attempt to retrieve the first row through the second snapshot context and
   *    confirm the endpoint rejects the cross-snapshot lookup.
   * 5. Confirm the original preserved rows remain unchanged after the read-only check.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemSnapshotId1 = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshotId2 = typia.random<string & tags.Format<"uuid">>();
  const created1 =
    await generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create(
      adminConnection,
      {
        params: { orderItemSnapshotId: orderItemSnapshotId1 },
        body: {
          optionName: RandomGenerator.name(1),
          optionValue: RandomGenerator.name(1),
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(created1);
  const created2 =
    await generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create(
      adminConnection,
      {
        params: { orderItemSnapshotId: orderItemSnapshotId2 },
        body: {
          optionName: RandomGenerator.name(1),
          optionValue: RandomGenerator.name(1),
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(created2);
  const fetched1 =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
      adminConnection,
      {
        orderItemSnapshotId: orderItemSnapshotId1,
        variantOptionId: created1.id,
      },
    );
  typia.assert(fetched1);
  const fetched2 =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
      adminConnection,
      {
        orderItemSnapshotId: orderItemSnapshotId2,
        variantOptionId: created2.id,
      },
    );
  typia.assert(fetched2);
  TestValidator.equals(
    "scoped lookup returns the first option from its own snapshot",
    fetched1.id,
    created1.id,
  );
  TestValidator.equals(
    "scoped lookup returns the second option from its own snapshot",
    fetched2.id,
    created2.id,
  );
  TestValidator.equals(
    "first option is bound to the first snapshot",
    fetched1.orderItemSnapshot.id,
    orderItemSnapshotId1,
  );
  TestValidator.equals(
    "second option is bound to the second snapshot",
    fetched2.orderItemSnapshot.id,
    orderItemSnapshotId2,
  );
  TestValidator.notEquals(
    "snapshot ids are intentionally different",
    fetched1.orderItemSnapshot.id,
    fetched2.orderItemSnapshot.id,
  );
  await TestValidator.httpError(
    "cross-snapshot lookup must be rejected as not found",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
        adminConnection,
        {
          orderItemSnapshotId: orderItemSnapshotId2,
          variantOptionId: created1.id,
        },
      );
    },
  );
  const refetched1 =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.variantOptions.getByOrderitemsnapshotidAndVariantoptionid(
      adminConnection,
      {
        orderItemSnapshotId: orderItemSnapshotId1,
        variantOptionId: created1.id,
      },
    );
  typia.assert(refetched1);
  TestValidator.equals(
    "read-only access leaves the first record unchanged",
    refetched1,
    fetched1,
  );
}
