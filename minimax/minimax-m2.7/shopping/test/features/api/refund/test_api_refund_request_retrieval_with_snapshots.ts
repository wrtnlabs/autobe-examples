import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_retrieval_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://admin.example.com/dashboard",
      referrer: "https://admin.example.com/login",
    },
  });
  typia.assert(admin);
  // Step 2: Retrieve refund request by ID
  // Note: This test assumes a pre-existing refund request in the system
  // that was created through a complete checkout → delivery → refund flow.
  // The refund request ID should be from a delivered order item.
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.admin.refund_requests.at(
      adminConnection,
      {
        requestId: requestId,
      },
    );
  typia.assert(refundRequest);
  // Step 3: Validate refund request structure
  TestValidator.equals(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(refundRequest.id),
    true,
  );
  TestValidator.predicate(
    "has valid status",
    ["pending", "approved", "rejected"].includes(refundRequest.status),
  );
  TestValidator.predicate("has reason", refundRequest.reason.length > 0);
  TestValidator.predicate("has created_at", !!refundRequest.created_at);
  TestValidator.predicate("has updated_at", !!refundRequest.updated_at);
  // Step 4: Validate order item summary
  const orderItem = refundRequest.orderItem;
  TestValidator.equals(
    "order item has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(orderItem.id),
    true,
  );
  TestValidator.predicate("order item has quantity", orderItem.quantity > 0);
  TestValidator.predicate(
    "order item has unit_price",
    orderItem.unit_price >= 0,
  );
  TestValidator.predicate(
    "order item has subtotal",
    orderItem.subtotal === orderItem.quantity * orderItem.unit_price,
  );
  TestValidator.predicate(
    "order item has valid status",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      orderItem.status,
    ),
  );
  // Step 5: Validate order item summary with nested order
  const order = orderItem.order;
  TestValidator.equals(
    "order has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(order.id),
    true,
  );
  TestValidator.predicate(
    "order has order_number",
    order.order_number.length > 0,
  );
  TestValidator.predicate("order has customer", !!order.customer);
  TestValidator.equals(
    "order customer has valid UUID",
    /^[0-9a-f-]{36}$/i.test(order.customer.id),
    true,
  );
  TestValidator.equals(
    "order customer has valid email",
    /^[^@]+@[^@]+$/.test(order.customer.email),
    true,
  );
  TestValidator.predicate(
    "order customer has status",
    ["active", "deleted"].includes(order.customer.status),
  );
  // Step 6: Validate frozen product snapshot (shows what was purchased at purchase time)
  const productSnapshot = orderItem.productSnapshot;
  TestValidator.equals(
    "product snapshot has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(productSnapshot.id),
    true,
  );
  TestValidator.predicate(
    "product snapshot has name",
    productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has description",
    typeof productSnapshot.description === "string",
  );
  TestValidator.predicate(
    "product snapshot has base_price",
    productSnapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "product snapshot has category_name",
    productSnapshot.category_name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has created_at",
    !!productSnapshot.created_at,
  );
  TestValidator.predicate(
    "product snapshot has seller",
    !!productSnapshot.seller,
  );
  // Step 7: Validate frozen seller profile snapshot (shows shop name/logo at purchase time)
  const sellerProfileSnapshot = orderItem.sellerProfileSnapshot;
  TestValidator.equals(
    "seller profile snapshot has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(sellerProfileSnapshot.id),
    true,
  );
  TestValidator.predicate(
    "seller profile snapshot has shop_name",
    sellerProfileSnapshot.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller profile snapshot has created_at",
    !!sellerProfileSnapshot.created_at,
  );
  // Step 8: Validate refund request snapshots array (audit trail for dispute resolution)
  const snapshots = refundRequest.refundRequestSnapshots;
  TestValidator.predicate(
    "has refund request snapshots array",
    Array.isArray(snapshots),
  );
  TestValidator.predicate(
    "has at least one snapshot for audit trail",
    snapshots.length > 0,
  );
  // Validate each snapshot structure
  for (const snapshot of snapshots) {
    TestValidator.equals(
      "snapshot has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
      true,
    );
    TestValidator.equals(
      "snapshot matches refund request id",
      snapshot.ecommerce_mall_refund_request_id,
      refundRequest.id,
    );
    TestValidator.predicate("snapshot has customer", !!snapshot.customer);
    TestValidator.equals(
      "snapshot customer has valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.customer.id),
      true,
    );
    TestValidator.predicate("snapshot has seller", !!snapshot.seller);
    TestValidator.equals(
      "snapshot seller has valid UUID",
      /^[0-9a-f-]{36}$/i.test(snapshot.seller.id),
      true,
    );
    TestValidator.predicate(
      "snapshot has reason",
      snapshot.snapshot_reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid status",
      ["pending", "approved", "rejected"].includes(snapshot.snapshot_status),
    );
    TestValidator.predicate(
      "snapshot has seller_response",
      ["approved", "rejected"].includes(snapshot.seller_response),
    );
    TestValidator.predicate("snapshot has created_at", !!snapshot.created_at);
    TestValidator.predicate("snapshot has updated_at", !!snapshot.updated_at);
  }
  // Step 9: Validate seller in refund request
  const seller = refundRequest.seller;
  TestValidator.equals(
    "seller has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(seller.id),
    true,
  );
  TestValidator.equals(
    "seller has valid email",
    /^[^@]+@[^@]+$/.test(seller.email),
    true,
  );
  TestValidator.predicate(
    "seller has approval_status",
    ["pending", "approved", "rejected", "suspended"].includes(
      seller.approval_status,
    ),
  );
  TestValidator.predicate("seller has profile", !!seller.profile);
}
