import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve order as admin using the same connection (headers already updated)
  const order = await api.functional.ecommerceMall.admin.orders.at(
    adminConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  // 3. Validate order structure
  TestValidator.equals("order has valid id", order.id !== undefined, true);
  TestValidator.equals(
    "order has customer",
    order.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "order has order_number",
    order.order_number.length > 0,
    true,
  );
  TestValidator.equals("order has total_price", order.total_price >= 0, true);
  TestValidator.equals(
    "order has overall_status",
    order.overall_status.length > 0,
    true,
  );
  TestValidator.equals(
    "order has created_at",
    order.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "order has updated_at",
    order.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "order has orderItems array",
    Array.isArray(order.orderItems),
    true,
  );
  TestValidator.equals(
    "order has shipments array",
    Array.isArray(order.shipments),
    true,
  );
  // 4. Validate customer reference
  TestValidator.equals(
    "customer has id",
    order.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has email",
    order.customer.email !== undefined,
    true,
  );
  TestValidator.equals(
    "customer has profile",
    order.customer.customerProfile !== undefined,
    true,
  );
  TestValidator.equals(
    "customer profile has displayName",
    order.customer.customerProfile.displayName !== undefined,
    true,
  );
  // 5. Validate order items structure if present
  if (order.orderItems.length > 0) {
    const firstItem = order.orderItems[0];
    TestValidator.equals("order item has id", firstItem.id !== undefined, true);
    TestValidator.equals(
      "order item has status",
      firstItem.item_status.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has quantity",
      firstItem.quantity >= 1,
      true,
    );
    TestValidator.equals(
      "order item has unit_price",
      firstItem.unit_price >= 0,
      true,
    );
    TestValidator.equals(
      "order item has product_snapshot",
      firstItem.product_snapshot.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has variant_snapshot",
      firstItem.variant_snapshot.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has seller_snapshot",
      firstItem.seller_profile_snapshot.length > 0,
      true,
    );
    TestValidator.equals(
      "order item has product",
      firstItem.product !== undefined,
      true,
    );
    TestValidator.equals(
      "order item has variant",
      firstItem.productVariant !== undefined,
      true,
    );
  }
  // 6. Validate shipments structure if present
  if (order.shipments.length > 0) {
    const firstShipment = order.shipments[0];
    TestValidator.equals(
      "shipment has id",
      firstShipment.id !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment has carrier",
      firstShipment.carrierName.length > 0,
      true,
    );
    TestValidator.equals(
      "shipment has tracking",
      firstShipment.trackingNumber.length > 0,
      true,
    );
    TestValidator.equals(
      "shipment has order reference",
      firstShipment.order !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment has seller reference",
      firstShipment.seller !== undefined,
      true,
    );
  }
}
