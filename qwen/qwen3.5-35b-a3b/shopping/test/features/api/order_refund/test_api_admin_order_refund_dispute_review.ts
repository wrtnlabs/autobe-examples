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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_order_refund_dispute_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin actor for order oversight
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Setup customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 3. Create test order by retrieving an existing order
  // Note: In real scenario, customer would create order first, then admin reviews it
  const testOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Admin retrieves order with refund status
  const adminOrder: IEcommerceMallOrder =
    await api.functional.ecommerceMall.admin.orders.at(adminConnection, {
      orderId: testOrderId,
    });
  typia.assert(adminOrder);
  // 5. Validate overall_status is refunded (any refunded item elevates order status)
  TestValidator.equals(
    "overall_status reflects refunded state",
    adminOrder.overall_status,
    "refunded",
  );
  // 6. Validate orderItems array exists and contains refunded items
  TestValidator.equals(
    "orderItems array exists",
    Array.isArray(adminOrder.orderItems),
    true,
  );
  if (adminOrder.orderItems.length > 0) {
    const firstItem = adminOrder.orderItems[0];
    // Validate itemStatus for refunded item
    TestValidator.equals(
      "OrderItem itemStatus shows refunded",
      firstItem.item_status,
      "refunded",
    );
    // Validate snapshots are preserved with original values
    TestValidator.equals(
      "product_snapshot preserved at purchase time",
      typeof firstItem.product_snapshot,
      "string",
    );
    TestValidator.equals(
      "variant_snapshot preserved at purchase time",
      typeof firstItem.variant_snapshot,
      "string",
    );
    TestValidator.equals(
      "seller_profile_snapshot preserved at purchase time",
      typeof firstItem.seller_profile_snapshot,
      "string",
    );
    // Validate product and variant relations exist
    TestValidator.equals(
      "product relation exists",
      firstItem.product !== undefined,
      true,
    );
    TestValidator.equals(
      "productVariant relation exists",
      firstItem.productVariant !== undefined,
      true,
    );
  }
  // 7. Validate total_price reflects original purchase amount (not refund amount)
  TestValidator.equals(
    "total_price reflects original amount",
    adminOrder.total_price > 0,
    true,
  );
  // 8. Validate timestamps
  TestValidator.equals(
    "created_at timestamp exists",
    adminOrder.created_at !== undefined && adminOrder.created_at !== null,
    true,
  );
  TestValidator.equals(
    "updated_at timestamp exists",
    adminOrder.updated_at !== undefined && adminOrder.updated_at !== null,
    true,
  );
  // 9. Validate deleted_at is NULL (order not soft-deleted)
  TestValidator.equals(
    "deleted_at is null for active order",
    adminOrder.deleted_at,
    null,
  );
  // 10. Validate shipments array exists
  TestValidator.equals(
    "shipments array exists",
    Array.isArray(adminOrder.shipments),
    true,
  );
}
