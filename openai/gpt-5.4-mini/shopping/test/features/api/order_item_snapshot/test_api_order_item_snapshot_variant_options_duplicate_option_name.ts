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

/**
 * Reject duplicate option names within a preserved order item snapshot.
 *
 * Validates the administrator-only snapshot variant option creation flow and the business rule that a single order item snapshot cannot store two preserved option rows with the same option name. This protects immutable purchase-history reconstruction from duplicate keys while keeping the original preserved row intact.
 *
 * 1. Create an administrator-authenticated connection.
 * 2. Create an initial snapshot option row with a unique option name/value pair.
 * 3. Reuse the same snapshot id and option name with a different option value.
 * 4. Verify the duplicate insert is rejected as a conflict-style business error.
 * 5. Confirm the original preserved option row remains unchanged.
 */
export async function test_api_order_item_snapshot_variant_options_duplicate_option_name(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: `${RandomGenerator.alphabets(8)}A1!` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionName = "color";
  const firstOptionValue = "red";
  const secondOptionValue = "blue";
  const created =
    await generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create(
      adminConnection,
      {
        params: { orderItemSnapshotId },
        body: {
          optionName,
          optionValue: firstOptionValue,
        } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("stored option name", created.optionName, optionName);
  TestValidator.equals(
    "stored option value",
    created.optionValue,
    firstOptionValue,
  );
  TestValidator.equals(
    "stored snapshot id",
    created.orderItemSnapshot.id,
    orderItemSnapshotId,
  );
  await TestValidator.httpError(
    "duplicate option name should be rejected",
    [400, 409],
    async () => {
      await generate_random_mall_platform_administrator_order_item_snapshots_variant_options_create(
        adminConnection,
        {
          params: { orderItemSnapshotId },
          body: {
            optionName,
            optionValue: secondOptionValue,
          } satisfies IMallPlatformOrderItemSnapshotVariantOption.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original option name remains unchanged",
    created.optionName,
    optionName,
  );
  TestValidator.equals(
    "original option value remains unchanged",
    created.optionValue,
    firstOptionValue,
  );
}
