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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator access to preserved order-item snapshot variant options.
 *
 * Validates that an authenticated administrator can retrieve the paginated
 * collection of normalized option-value pairs preserved inside an order item
 * snapshot. The test focuses on response structure, pagination metadata, and
 * read-only stability for dispute-review use cases.
 *
 * 1. Authenticate as an administrator using the supported join utility.
 * 2. Request preserved variant options for a UUID-scoped order, order item, and snapshot.
 * 3. Validate pagination metadata and row structure.
 * 4. Repeat the request to ensure the read-only response remains stable.
 */
export async function test_api_order_item_snapshot_variant_options_list(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const props = {
    orderId: typia.random<string & tags.Format<"uuid">>(),
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    snapshotId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies {
    orderId: string & tags.Format<"uuid">;
    orderItemId: string & tags.Format<"uuid">;
    snapshotId: string & tags.Format<"uuid">;
  };
  const output =
    await api.functional.mallPlatform.administrator.orders.orderItems.snapshots.variantOptions.index(
      adminConnection,
      props,
    );
  typia.assert(output);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data length matches pagination records on single page responses",
    output.data.length,
    output.pagination.records,
  );
  for (const row of output.data) {
    typia.assert(row);
    TestValidator.predicate("row id is present", row.id.length > 0);
    TestValidator.predicate(
      "option name is present",
      row.optionName.length > 0,
    );
    TestValidator.predicate(
      "option value is present",
      row.optionValue.length > 0,
    );
    typia.assert(row.orderItemSnapshot);
    TestValidator.equals(
      "row snapshot id matches parent snapshot",
      row.orderItemSnapshot.id,
      props.snapshotId,
    );
  }
  const repeated =
    await api.functional.mallPlatform.administrator.orders.orderItems.snapshots.variantOptions.index(
      adminConnection,
      props,
    );
  typia.assert(repeated);
  TestValidator.equals(
    "repeat request returns same pagination",
    repeated.pagination,
    output.pagination,
  );
  TestValidator.equals(
    "repeat request returns same rows",
    repeated.data,
    output.data,
  );
}
