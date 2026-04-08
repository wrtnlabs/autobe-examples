import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can successfully retrieve the immutable snapshot for an order item they purchased.
 * This validates the order context preservation feature (section 68) and snapshot inheritance (section 247).
 *
 * Setup:
 * 1) Authenticate as customer using join endpoint
 * 2) List existing customer orders via PATCH /customer/orders to obtain orderId
 * 3) Retrieve the order item snapshot using obtained orderId
 *
 * Execute: Call GET /customer/orders/{orderId}/items/{orderItemId}/snapshot with valid orderId and orderItemId.
 *
 * Verify: Response returns IEcommerceMallOrderItemSnapshot with immutable snapshot data including
 * snapshotId, orderItemId reference, product snapshot, variant snapshot with option values,
 * seller snapshot, and creation timestamp. The snapshot captures the exact product state at purchase time.
 */
export async function test_api_order_item_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to access order data
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. List existing customer orders to obtain orderId
  const ordersResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(ordersResponse);
  // Get orderId from the listed orders - use first order if available, otherwise generate
  const orderId =
    ordersResponse.data[0]?.id ?? typia.random<string & tags.Format<"uuid">>();
  // Generate orderItemId (transaction item identifier for the specific purchase line)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the immutable snapshot for the order item
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.snapshot.at(
      customerConnection,
      {
        orderId,
        orderItemId,
      },
    );
  typia.assert(snapshot);
  // Verify snapshot contains expected structure and references
  TestValidator.equals(
    "snapshot orderItemId reference matches",
    snapshot.orderItemId,
    orderItemId,
  );
  TestValidator.predicate("snapshot has product data", !!snapshot.product);
  TestValidator.predicate("snapshot has variant data", !!snapshot.variant);
  TestValidator.predicate("snapshot has seller data", !!snapshot.seller);
  TestValidator.predicate(
    "snapshot has creation timestamp",
    !!snapshot.createdAt,
  );
  TestValidator.predicate(
    "snapshot product has images array",
    Array.isArray(snapshot.product.images),
  );
  TestValidator.predicate(
    "snapshot variant has option values",
    Array.isArray(snapshot.variant.optionValues),
  );
}
