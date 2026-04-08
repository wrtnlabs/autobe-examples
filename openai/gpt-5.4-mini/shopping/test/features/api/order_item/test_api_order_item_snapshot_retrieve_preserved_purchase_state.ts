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

export async function test_api_order_item_snapshot_retrieve_preserved_purchase_state(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies seller-accessible order item snapshot retrieval preserves the
   * purchase-time state for an immutable historical record.
   *
   * This test focuses on the read contract of the snapshot endpoint: it uses a
   * seller-authenticated connection, requests a snapshot through a valid UUID
   * hierarchy, and validates that the response is a stable snapshot payload
   * containing the preserved product, seller, variant, and order-item summary
   * fields expected for dispute resolution and historical review.
   *
   * 1. Authenticate as a seller using the dedicated join utility.
   * 2. Request an order-item snapshot using syntactically valid UUIDs.
   * 3. Assert the response shape and validate preserved purchase-state fields.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const props = {
    orderId: typia.random<string & tags.Format<"uuid">>(),
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    snapshotId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies Parameters<
    typeof api.functional.mallPlatform.seller.orders.orderItems.snapshots.at
  >[1];
  const output =
    await api.functional.mallPlatform.seller.orders.orderItems.snapshots.at(
      sellerConnection,
      props,
    );
  typia.assert(output);
  TestValidator.equals("snapshot id preserved", output.id, props.snapshotId);
  TestValidator.equals(
    "order item id preserved",
    output.orderItem.id,
    props.orderItemId,
  );
  TestValidator.equals(
    "order id preserved",
    output.orderItem.order.id,
    props.orderId,
  );
  TestValidator.predicate(
    "snapshot timestamp is recorded",
    () => output.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason is recorded",
    () => output.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "product name is preserved",
    () => output.productName.length > 0,
  );
  TestValidator.predicate(
    "product description is preserved",
    () => output.productDescription.length > 0,
  );
  TestValidator.predicate(
    "product SKU is preserved",
    () => output.productSku.length > 0,
  );
  TestValidator.predicate(
    "variant SKU code is preserved",
    () => output.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name is preserved",
    () => output.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "seller shop description is preserved",
    () => output.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller logo image url is preserved",
    () => output.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    () => output.unitPrice >= 0,
  );
  TestValidator.predicate("quantity is positive", () => output.quantity > 0);
  TestValidator.predicate(
    "line total is non-negative",
    () => output.lineTotal >= 0,
  );
  TestValidator.predicate(
    "order item status is preserved",
    () => output.orderItemStatus.length > 0,
  );
  TestValidator.predicate("variant options are normalized", () =>
    Array.isArray(output.variantOptions),
  );
  TestValidator.predicate(
    "nested order item summary exists",
    () => output.orderItem.id === props.orderItemId,
  );
}
