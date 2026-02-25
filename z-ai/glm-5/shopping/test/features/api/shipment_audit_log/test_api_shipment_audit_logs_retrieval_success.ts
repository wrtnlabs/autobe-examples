import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipmentAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipmentAuditLog";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test the primary success path for retrieving shipment audit logs.
 *
 * A seller retrieves the audit log history for their own shipment to verify
 * complete traceability. The test validates:
 * 1. Successful authentication as a seller who owns the shipment
 * 2. Correct pagination of audit log results
 * 3. The initial 'created' event type is present in the audit logs
 * 4. Each audit log entry contains required fields
 * 5. Results are sorted by created_at in descending order
 * 6. The shipment reference correctly identifies the parent shipment
 */
export async function test_api_shipment_audit_logs_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account (will be pending)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        shop_name: RandomGenerator.name(),
      },
    },
  );
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoinResult.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller logs in after approval
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 7. Seller creates variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 8. Seller adds inventory to the variant
  const inventoryRecord =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "Initial stock for audit log test",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 9. Customer adds variant to cart
  const cartItem = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 1,
      },
    },
  );
  typia.assert(cartItem);
  // 10. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 11. Get order item IDs with 'paid' status
  const paidOrderItemIds = order.orderItems
    .filter((item) => item.status === "paid")
    .map((item) => item.id);
  TestValidator.predicate("order has paid items", paidOrderItemIds.length > 0);
  // 12. Seller creates shipment for the paid order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: paidOrderItemIds,
          carrierName: "FedEx",
          trackingNumber: `TRK${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(shipment);
  // 13. Seller retrieves audit logs for the shipment
  const auditLogsResult =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipmentAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResult);
  // 14. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    auditLogsResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    auditLogsResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination has records count",
    auditLogsResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages count",
    auditLogsResult.pagination.pages >= 1,
  );
  // 15. Validate audit log entries exist
  TestValidator.predicate("audit logs exist", auditLogsResult.data.length >= 1);
  // 16. Find the 'created' event in audit logs
  const createdEvent = auditLogsResult.data.find(
    (log) => log.event_type === "created",
  );
  TestValidator.predicate(
    "created event exists in audit logs",
    createdEvent !== undefined,
  );
  // 17. Validate the created event has required fields
  if (createdEvent) {
    TestValidator.predicate(
      "created event has id",
      createdEvent.id !== null && createdEvent.id !== undefined,
    );
    TestValidator.predicate(
      "created event has event_type",
      createdEvent.event_type === "created",
    );
    TestValidator.predicate(
      "created event has new_status",
      createdEvent.new_status !== null && createdEvent.new_status !== undefined,
    );
    TestValidator.predicate(
      "created event has actor_type",
      createdEvent.actor_type !== null && createdEvent.actor_type !== undefined,
    );
    TestValidator.predicate(
      "created event has created_at",
      createdEvent.created_at !== null && createdEvent.created_at !== undefined,
    );
  }
  // 18. Validate shipment reference in audit logs
  for (const log of auditLogsResult.data) {
    TestValidator.predicate(
      "audit log has shipment reference",
      log.shipment !== null && log.shipment !== undefined,
    );
    TestValidator.equals("shipment id matches", log.shipment.id, shipment.id);
    TestValidator.equals(
      "carrier name matches",
      log.shipment.carrierName,
      "FedEx",
    );
    TestValidator.equals(
      "tracking number matches",
      log.shipment.trackingNumber,
      shipment.tracking_number,
    );
    TestValidator.predicate(
      "shipment has seller reference",
      log.shipment.seller !== null && log.shipment.seller !== undefined,
    );
  }
  // 19. Validate sorting (descending by created_at)
  if (auditLogsResult.data.length > 1) {
    for (let i = 0; i < auditLogsResult.data.length - 1; i++) {
      const currentCreatedAt = new Date(auditLogsResult.data[i].created_at);
      const nextCreatedAt = new Date(auditLogsResult.data[i + 1].created_at);
      TestValidator.predicate(
        "audit logs sorted by created_at descending",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 20. Test filtering by event_type
  const createdOnlyLogs =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          event_type: "created",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipmentAuditLog.IRequest,
      },
    );
  typia.assert(createdOnlyLogs);
  TestValidator.predicate(
    "filtered results contain only created events",
    createdOnlyLogs.data.every((log) => log.event_type === "created"),
  );
  // 21. Test filtering by actor_type
  const sellerActorLogs =
    await api.functional.shoppingMall.seller.shipments.audit_logs.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          actor_type: "seller",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderShipmentAuditLog.IRequest,
      },
    );
  typia.assert(sellerActorLogs);
  TestValidator.predicate(
    "filtered results contain only seller actor events",
    sellerActorLogs.data.every((log) => log.actor_type === "seller"),
  );
}
