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
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_purchase_history_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order should contain order items",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  const snapshot =
    await api.functional.mallPlatform.customer.orderItems.snapshots.at(
      customerConnection,
      {
        orderItemId: orderItem.id,
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot parent order item id",
    snapshot.mallPlatformOrderItemId,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot order item id matches context",
    snapshot.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot order item status preserved",
    snapshot.orderItemStatus,
    orderItem.status,
  );
  TestValidator.equals(
    "snapshot order item quantity preserved",
    snapshot.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "snapshot order item summary quantity",
    snapshot.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "snapshot order item summary status",
    snapshot.orderItem.status,
    orderItem.status,
  );
  TestValidator.equals(
    "snapshot order id preserved",
    snapshot.orderItem.order.id,
    order.id,
  );
  TestValidator.equals(
    "snapshot customer order id preserved",
    snapshot.orderItem.order.orderNumber,
    order.orderNumber,
  );
  TestValidator.equals(
    "snapshot line total computed",
    snapshot.lineTotal,
    snapshot.unitPrice * snapshot.quantity,
  );
  TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot reason exists",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot timestamp exists",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "product name exists",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "product description exists",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate("product sku exists", snapshot.productSku.length > 0);
  TestValidator.predicate(
    "variant sku code exists",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "seller shop name exists",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "seller shop description exists",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller logo url exists",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "variant options array exists",
    Array.isArray(snapshot.variantOptions),
  );
  if (snapshot.variantOptions.length > 0) {
    const firstOption = snapshot.variantOptions[0];
    typia.assert(firstOption);
    TestValidator.equals(
      "variant option snapshot parent id",
      firstOption.orderItemSnapshot.id,
      snapshot.id,
    );
    TestValidator.predicate(
      "variant option name exists",
      firstOption.optionName.length > 0,
    );
    TestValidator.predicate(
      "variant option value exists",
      firstOption.optionValue.length > 0,
    );
  }
}
