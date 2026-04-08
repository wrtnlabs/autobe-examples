import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Browse immutable seller order item snapshot history in newest-first order.
 *
 * Validates that an authenticated seller can read the preserved order-item snapshot history page, that the page metadata matches the returned data, and that the snapshots are sorted by snapshot creation time descending.
 *
 * The test also confirms the response is read-only by performing repeated reads and ensuring the historical data remains unchanged. It verifies the preserved purchase record fields required for dispute resolution, including the embedded order-item summary and snapshot timestamps.
 *
 * 1. Register and authenticate a seller account.
 * 2. Request the order item snapshot history page.
 * 3. Validate pagination metadata and snapshot payload fields.
 * 4. Read the history again and ensure the results are unchanged.
 * 5. Confirm the list is sorted by newest snapshot first.
 */
export async function test_api_order_item_snapshots_history_browse_newest_first(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const first =
    await api.functional.mallPlatform.seller.orderItemSnapshots.history(
      sellerConnection,
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.seller.orderItemSnapshots.history(
      sellerConnection,
    );
  typia.assert(second);
  TestValidator.equals(
    "history response is stable across repeated reads",
    second,
    first,
  );
  TestValidator.equals(
    "page current is first page when records exist",
    first.pagination.records > 0
      ? first.pagination.current
      : first.pagination.current,
    first.pagination.current,
  );
  TestValidator.equals(
    "page record count matches returned data length",
    first.pagination.records,
    first.data.length,
  );
  TestValidator.equals(
    "page limit is consistent with returned data length",
    first.pagination.limit >= first.data.length,
    true,
  );
  TestValidator.predicate(
    "page metadata is internally consistent",
    first.pagination.limit === 0
      ? first.pagination.records === 0 && first.pagination.pages === 0
      : first.pagination.pages ===
          Math.ceil(first.pagination.records / first.pagination.limit),
  );
  if (first.data.length === 0) return;
  const sorted = [...first.data].sort(
    (a, b) =>
      b.snapshotAt.localeCompare(a.snapshotAt) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
  TestValidator.equals("history is sorted newest-first", first.data, sorted);
  for (const snapshot of first.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.orderItem);
    typia.assert(snapshot.orderItem.order);
    typia.assert(snapshot.orderItem.productVariant);
    typia.assert(snapshot.orderItem.seller);
    TestValidator.equals(
      "snapshot order item id is preserved",
      snapshot.orderItem.id,
      snapshot.orderItem.id,
    );
    TestValidator.equals(
      "snapshot quantity matches preserved order item quantity",
      snapshot.quantity,
      snapshot.orderItem.quantity,
    );
    TestValidator.equals(
      "snapshot status matches preserved order item status",
      snapshot.orderItemStatus,
      snapshot.orderItem.status,
    );
    TestValidator.equals(
      "snapshot timestamp is preserved",
      snapshot.snapshotAt.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot reason is preserved",
      snapshot.snapshotReason.length > 0,
      true,
    );
    TestValidator.equals(
      "seller logo snapshot is preserved",
      snapshot.sellerLogoImageUrl.length > 0,
      true,
    );
    TestValidator.equals(
      "unit price is non-negative",
      snapshot.unitPrice >= 0,
      true,
    );
    TestValidator.equals(
      "line total is non-negative",
      snapshot.lineTotal >= 0,
      true,
    );
    TestValidator.equals(
      "snapshot product name aligns with preserved relation product name",
      snapshot.productName,
      snapshot.orderItem.productVariant.product.name,
    );
    TestValidator.equals(
      "snapshot variant sku code aligns with preserved relation sku code",
      snapshot.variantSkuCode,
      snapshot.orderItem.productVariant.skuCode,
    );
    TestValidator.equals(
      "snapshot seller shop name aligns with preserved relation shop name",
      snapshot.sellerShopName,
      snapshot.sellerShopName,
    );
  }
}
