import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify immutable order item snapshot history listing for administrator review.
 *
 * This test authenticates an administrator, requests the order item snapshot history endpoint with multiple paging and sorting permutations, and validates that the API preserves historical purchase-time fields while only changing the page ordering according to the requested sort parameters.
 *
 * 1. Authenticate an administrator with an isolated connection.
 * 2. Request the snapshot history for an order item with default sort.
 * 3. Request additional pages and explicit sort variations.
 * 4. Validate preserved snapshot fields and nested order item context.
 */
export async function test_api_order_item_snapshot_history_listing(
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
  const defaultPage =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default snapshot page should contain pagination metadata",
    defaultPage.pagination.current >= 1 && defaultPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "default snapshot page should be within bounds",
    defaultPage.pagination.pages >= 0 && defaultPage.pagination.records >= 0,
  );
  if (defaultPage.data.length > 0) {
    const first = defaultPage.data[0];
    typia.assert(first);
    TestValidator.predicate(
      "snapshot timestamp should be present",
      first.snapshotAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason should be present",
      first.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "order item status should be present",
      first.orderItemStatus.length > 0,
    );
    TestValidator.predicate(
      "product name should be present",
      first.productName.length > 0,
    );
    TestValidator.predicate(
      "product description should be present",
      first.productDescription.length > 0,
    );
    TestValidator.predicate(
      "product SKU should be present",
      first.productSku.length > 0,
    );
    TestValidator.predicate(
      "variant SKU code should be present",
      first.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "seller shop name should be present",
      first.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "seller shop description should be present",
      first.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller logo URL should be present",
      first.sellerLogoImageUrl.length > 0,
    );
    TestValidator.predicate(
      "unit price should be non-negative",
      first.unitPrice >= 0,
    );
    TestValidator.predicate("quantity should be positive", first.quantity > 0);
    TestValidator.predicate(
      "line total should be non-negative",
      first.lineTotal >= 0,
    );
    typia.assert(first.orderItem);
  }
  const secondPage =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "page size should follow requested limit",
    secondPage.pagination.limit,
    10,
  );
  const sortedNewest =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
          sort: "-snapshotAt",
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortedNewest);
  const sortedOldest =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      administratorConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
          sort: "+snapshotAt",
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortedOldest);
  if (sortedNewest.data.length > 1) {
    TestValidator.predicate(
      "newest-first sort should return descending snapshot timestamps",
      sortedNewest.data[0].snapshotAt >=
        sortedNewest.data[sortedNewest.data.length - 1].snapshotAt,
    );
  }
  if (sortedOldest.data.length > 1) {
    TestValidator.predicate(
      "oldest-first sort should return ascending snapshot timestamps",
      sortedOldest.data[0].snapshotAt <=
        sortedOldest.data[sortedOldest.data.length - 1].snapshotAt,
    );
  }
  TestValidator.equals(
    "sorting should not alter preserved snapshot count",
    sortedNewest.pagination.records,
    sortedOldest.pagination.records,
  );
  TestValidator.equals(
    "sorting should not alter preserved page size",
    sortedNewest.pagination.limit,
    sortedOldest.pagination.limit,
  );
  if (defaultPage.data.length > 0 && sortedNewest.data.length > 0) {
    TestValidator.equals(
      "default ordering should match explicit newest-first ordering for the first record",
      defaultPage.data[0].id,
      sortedNewest.data[0].id,
    );
  }
  if (sortedNewest.data.length > 0 && sortedOldest.data.length > 0) {
    const newestSnapshot = sortedNewest.data[0];
    const oldestSnapshot = sortedOldest.data[sortedOldest.data.length - 1];
    typia.assert(newestSnapshot);
    typia.assert(oldestSnapshot);
    TestValidator.predicate(
      "preserved product name should remain a valid string",
      newestSnapshot.productName.length > 0 &&
        oldestSnapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "preserved seller shop name should remain a valid string",
      newestSnapshot.sellerShopName.length > 0 &&
        oldestSnapshot.sellerShopName.length > 0,
    );
  }
}
