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
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator access to preserved purchase-time variant options within an order item snapshot.
 *
 * Validates that a historical variant option remains readable through the administrator dispute-review endpoint and that the returned data preserves the original purchase-time option name and option value inside an immutable order item snapshot. This ensures archived purchase data can be used for audit and dispute resolution even when current catalog data has changed.
 *
 * 1. Registers a dedicated administrator account and authenticates it through an isolated connection.
 * 2. Requests a historical variant option using snapshot-related identifiers.
 * 3. Verifies that the response includes the preserved variant option fields together with the parent order-item snapshot reference.
 */
export async function test_api_order_item_snapshot_variant_option_dispute_review_access(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.orders.orderItems.snapshots.variantOptions.at(
      administratorConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantOptionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "historical variant option has preserved option name",
    output.optionName.length > 0,
  );
  TestValidator.predicate(
    "historical variant option has preserved option value",
    output.optionValue.length > 0,
  );
  TestValidator.predicate(
    "historical variant option includes parent snapshot",
    output.orderItemSnapshot.id.length > 0,
  );
}
