import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order detail response includes order items",
    order.orderItems.length >= 0,
  );
  if (order.orderItems.length === 0) return;
  const orderItem = order.orderItems[0];
  const snapshot =
    await api.functional.mallPlatform.customer.orderItems.snapshots.getByOrderitemidAndSnapshotid(
      customerConnection,
      {
        orderItemId: orderItem.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to requested order item",
    snapshot.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot order item id preserved",
    snapshot.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot order item status preserved",
    snapshot.orderItemStatus,
    orderItem.status,
  );
  TestValidator.predicate(
    "snapshot timestamp exists",
    snapshot.snapshotAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot reason exists",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves product description",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves product SKU",
    snapshot.productSku.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves variant SKU code",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves seller shop name",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves seller shop description",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot preserves seller logo image url",
    snapshot.sellerLogoImageUrl.length > 0,
  );
  TestValidator.predicate(
    "snapshot unit price is non-negative",
    snapshot.unitPrice >= 0,
  );
  TestValidator.predicate(
    "snapshot quantity is positive",
    snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot line total is non-negative",
    snapshot.lineTotal >= 0,
  );
}
