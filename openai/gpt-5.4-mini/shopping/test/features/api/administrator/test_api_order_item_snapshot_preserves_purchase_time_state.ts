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

export async function test_api_order_item_snapshot_preserves_purchase_time_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an administrator can read an immutable order item snapshot and
   * that preserved purchase-time fields remain structurally intact.
   *
   * This test authenticates an administrator, retrieves an order item snapshot,
   * and validates the historical purchase record returned by the API. It checks
   * the snapshot-level scalar fields together with the nested order item, order,
   * product variant, seller, product, category, and image summaries to ensure
   * the response is suitable for dispute review and historical reconstruction.
   *
   * 1. Authenticate as an administrator using the join endpoint.
   * 2. Retrieve an order item snapshot by UUID.
   * 3. Validate the snapshot payload and all nested summaries with typia.assert.
   * 4. Confirm that preserved historical fields are internally consistent.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.at(
      adminConnection,
      {
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  const orderItem = snapshot.orderItem;
  typia.assert(orderItem);
  typia.assert(orderItem.order);
  typia.assert(orderItem.productVariant);
  typia.assert(orderItem.seller);
  typia.assert(orderItem.productVariant.product);
  typia.assert(orderItem.productVariant.product.sellerAccount);
  if (orderItem.productVariant.product.category !== null) {
    typia.assert(orderItem.productVariant.product.category);
  }
  if (orderItem.productVariant.product.mainImage !== null) {
    typia.assert(orderItem.productVariant.product.mainImage);
  }
  TestValidator.equals(
    "snapshot order item id should match nested order item reference",
    snapshot.mallPlatformOrderItemId,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot order item quantity should match the nested order item quantity",
    snapshot.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "snapshot order item status should match the nested order item status",
    snapshot.orderItemStatus,
    orderItem.status,
  );
  TestValidator.equals(
    "snapshot product name should match the preserved product name",
    snapshot.productName,
    orderItem.productVariant.product.name,
  );
  TestValidator.equals(
    "snapshot product description should match the preserved product description",
    snapshot.productDescription,
    orderItem.productVariant.product.description,
  );
  TestValidator.equals(
    "snapshot variant SKU code should match the purchased variant SKU code",
    snapshot.variantSkuCode,
    orderItem.productVariant.skuCode,
  );
  TestValidator.equals(
    "snapshot seller shop name should match the preserved seller summary name",
    snapshot.sellerShopName,
    orderItem.seller.id,
  );
  TestValidator.equals(
    "snapshot seller shop description should match the preserved seller summary status",
    snapshot.sellerShopDescription,
    orderItem.seller.status,
  );
  TestValidator.equals(
    "snapshot unit price should be preserved as a numeric amount",
    snapshot.unitPrice >= 0,
    true,
  );
  TestValidator.equals(
    "snapshot line total should equal unit price multiplied by quantity",
    snapshot.lineTotal,
    snapshot.unitPrice * snapshot.quantity,
  );
  TestValidator.predicate(
    "snapshot reason should be recorded",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot timestamp should be recorded",
    snapshot.snapshotAt.length > 0,
  );
}
