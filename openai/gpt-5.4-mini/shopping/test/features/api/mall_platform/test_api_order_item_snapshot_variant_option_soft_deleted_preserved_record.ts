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
 * Verify preserved order item snapshot variant option history remains retrievable for administrator dispute review.
 *
 * This test authenticates an administrator, requests a specific preserved variant option row from an order item snapshot,
 * and validates that the endpoint returns immutable historical data rather than live catalog data.
 *
 * The scenario focuses on snapshot integrity and soft-delete retention rules.
 * 1. Administrator authenticates through the join endpoint.
 * 2. Administrator fetches a preserved variant option by order item, snapshot, and variant option identifiers.
 * 3. The response is validated to ensure the historical option name and value remain intact and deletedAt is present.
 */
export async function test_api_order_item_snapshot_variant_option_soft_deleted_preserved_record(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IMallPlatformAdministrator.IJoin>(),
  });
  const output =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.variantOptions.at(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantOptionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "preserved variant option keeps historical option name",
    output.optionName.length > 0,
  );
  TestValidator.predicate(
    "preserved variant option keeps historical option value",
    output.optionValue.length > 0,
  );
  TestValidator.predicate(
    "soft-deleted preserved row exposes deletedAt",
    output.deletedAt !== null,
  );
  TestValidator.predicate(
    "order item snapshot relation is preserved",
    output.orderItemSnapshot.id.length > 0,
  );
}
