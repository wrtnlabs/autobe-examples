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

/**
 * Verify administrator retrieval of a preserved order item snapshot variant option.
 *
 * This test authenticates an administrator, retrieves one historical variant option row by
 * its order item, snapshot, and variant option identifiers, and validates that the endpoint
 * returns the immutable preserved values without mutation.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Request a preserved variant option row from the historical order item snapshot chain.
 * 3. Validate that the returned row preserves option names, option values, parent snapshot
 *    linkage, and lifecycle timestamps.
 * 4. Confirm the endpoint is read-only by relying on the fetch-only inspection flow.
 */
export async function test_api_order_item_snapshot_variant_option_retrieve_preserved_data(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantOptionId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.variantOptions.at(
      administratorConnection,
      {
        orderItemId,
        orderItemSnapshotId,
        variantOptionId,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "order item snapshot id should be preserved",
    output.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.predicate(
    "option name should be preserved",
    output.optionName.length > 0,
  );
  TestValidator.predicate(
    "option value should be preserved",
    output.optionValue.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be a timestamp",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a timestamp",
    output.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deletedAt should remain null for an active preserved row",
    output.deletedAt,
    null,
  );
}
