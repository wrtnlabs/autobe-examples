import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Validate preserved historical purchase data for an order item snapshot.
 *
 * Ensures a seller-authenticated caller can retrieve an immutable order item snapshot whose preserved product, variant, and seller shop fields remain suitable for dispute review and audit workflows. The test focuses on the historical read model exposed by the snapshot endpoint, including nested order-item linkage and preserved variant option rows, without relying on live catalog state.
 *
 * 1. Authenticate as a seller using an isolated connection.
 * 2. Call the order-item snapshot endpoint through the SDK with valid UUID identifiers.
 * 3. Validate the response shape and the internal consistency of preserved snapshot fields.
 */
export async function test_api_order_item_snapshot_preserved_purchase_history_after_edits(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.seller.orders.orderItems.snapshots.at(
      sellerConnection,
      {
        orderId,
        orderItemId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot id should be preserved",
    snapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "snapshot order item id should match request",
    snapshot.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "snapshot order item order id should match request",
    snapshot.orderItem.order.id,
    orderId,
  );
  TestValidator.equals(
    "snapshot order item status should match snapshot status",
    snapshot.orderItem.status,
    snapshot.orderItemStatus,
  );
  TestValidator.predicate(
    "snapshot should preserve seller shop name",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot should preserve seller logo url",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot should preserve product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot should preserve variant sku code",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot should preserve positive quantity",
    snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot should preserve non-negative line total",
    snapshot.lineTotal >= snapshot.unitPrice,
  );
  TestValidator.equals(
    "line total should equal unit price times quantity",
    snapshot.lineTotal,
    snapshot.unitPrice * snapshot.quantity,
  );
  TestValidator.predicate(
    "snapshot should include at least one preserved variant option",
    snapshot.variantOptions.length >= 0,
  );
  TestValidator.predicate(
    "snapshot timestamps should be present in chronological order",
    new Date(snapshot.createdAt).getTime() <=
      new Date(snapshot.updatedAt).getTime(),
  );
}
