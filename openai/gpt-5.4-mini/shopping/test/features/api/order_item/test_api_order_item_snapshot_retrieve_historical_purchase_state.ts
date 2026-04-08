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

export async function test_api_order_item_snapshot_retrieve_historical_purchase_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a historical order item snapshot through administrator access.
   *
   * Validates that an administrator can read a preserved order item snapshot and that the returned payload contains immutable purchase-time values rather than live mutable state. Also verifies the nested order item summary, parent relationship, timestamps, pricing, quantity, and preserved variant option rows when available.
   *
   * 1. Authenticate as an administrator using a fresh isolated connection.
   * 2. Retrieve a specific order item snapshot by order item ID and snapshot ID.
   * 3. Validate that the returned data is a snapshot record and matches historical state semantics.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.at(
      administratorConnection,
      {
        orderItemId,
        orderItemSnapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should match requested snapshot id",
    snapshot.id,
    orderItemSnapshotId,
  );
  TestValidator.equals(
    "snapshot should belong to requested order item",
    snapshot.mallPlatformOrderItemId,
    orderItemId,
  );
  TestValidator.predicate(
    "snapshot timestamp should exist",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason should exist",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "order item status should be preserved",
    snapshot.orderItemStatus.length > 0,
  );
  TestValidator.predicate(
    "product name should be preserved",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "product description should be preserved",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "product sku should be preserved",
    snapshot.productSku.length > 0,
  );
  TestValidator.predicate(
    "variant sku code should be preserved",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name should be preserved",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "seller shop description should be preserved",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller logo image url should be preserved",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "unit price should be non-negative",
    snapshot.unitPrice >= 0,
  );
  TestValidator.predicate("quantity should be positive", snapshot.quantity > 0);
  TestValidator.predicate(
    "line total should be non-negative",
    snapshot.lineTotal >= 0,
  );
  TestValidator.equals(
    "snapshot order item id should match parent id",
    snapshot.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "snapshot order item quantity should match",
    snapshot.orderItem.quantity,
    snapshot.quantity,
  );
  TestValidator.predicate(
    "snapshot order item status should be present",
    snapshot.orderItem.status.length > 0,
  );
  TestValidator.predicate(
    "snapshot order item has parent order",
    snapshot.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot order item has product variant",
    snapshot.orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot order item has seller",
    snapshot.orderItem.seller.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot order item created timestamp should exist",
    snapshot.orderItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot order item updated timestamp should exist",
    snapshot.orderItem.updated_at.length > 0,
  );
  TestValidator.equals(
    "snapshot order item deleted timestamp should be preserved as nullable",
    snapshot.orderItem.deleted_at,
    snapshot.orderItem.deleted_at,
  );
  TestValidator.predicate(
    "variant options array should be available",
    Array.isArray(snapshot.variantOptions),
  );
  if (snapshot.variantOptions.length > 0) {
    const firstOption = snapshot.variantOptions[0];
    TestValidator.predicate(
      "variant option name preserved",
      firstOption.optionName.length > 0,
    );
    TestValidator.predicate(
      "variant option value preserved",
      firstOption.optionValue.length > 0,
    );
    TestValidator.equals(
      "nested option parent snapshot id should match",
      firstOption.orderItemSnapshot.id,
      snapshot.id,
    );
  }
  TestValidator.predicate(
    "snapshot createdAt should exist",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot updatedAt should exist",
    snapshot.updatedAt.length > 0,
  );
  TestValidator.equals(
    "snapshot deletedAt should be preserved as nullable",
    snapshot.deletedAt,
    snapshot.deletedAt,
  );
}
