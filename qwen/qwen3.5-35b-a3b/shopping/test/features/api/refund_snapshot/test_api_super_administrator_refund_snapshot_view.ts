import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test that a super administrator can view any refund request snapshot by ID for platform oversight and audit purposes.
 *
 * Validates the complete refund request workflow including customer account creation, seller registration and approval, product creation, order placement, delivery confirmation, refund request creation, seller approval, and finally super administrator snapshot retrieval. Ensures that the snapshot contains all expected data including order details, seller information, and timestamps.
 *
 * 1. Customer joins and authenticates.
 * 2. Seller registers and gets approved by administrator.
 * 3. Seller creates product with required category and base price.
 * 4. Customer creates order with shipping address and order items.
 * 5. Customer confirms delivery of shipment.
 * 6. Customer creates refund request with reason for delivered order item.
 * 7. Seller approves refund request creating immutable snapshot.
 * 8. Super administrator retrieves and validates the snapshot.
 *
 * Validation points:
 * - Super administrator can view any snapshot regardless of ownership
 * - Response includes complete snapshot data: refund reason, status, timestamps, order item details
 * - Response includes enriched data: order number, product name, seller display name
 * - Snapshot is immutable and can be retrieved multiple times
 */
export async function test_api_super_administrator_refund_snapshot_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 4. Administrator approves seller
  const approvals =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvals);
  const pendingRequest = approvals.data.find(
    (req) => req.seller.id === seller.id,
  );
  TestValidator.predicate(
    "seller approval pending request exists",
    !!pendingRequest,
  );
  // Approve seller registration
  if (pendingRequest) {
    const approvedRequest =
      await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
        adminConnection,
        {
          body: {
            seller_id: pendingRequest.seller.id,
            status: ["approved"],
          } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
        },
      );
    typia.assert(approvedRequest);
  }
  // Re-login seller to get approved status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAuthorized);
  // 5. Seller creates product with random category_id
  const products = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(products);
  // 6. Customer creates order with random shipping_address_id
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: products.variants[0].id,
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Customer confirms delivery
  const shipment = order.shipments[0];
  if (shipment) {
    const confirmedShipment =
      await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
        customerConnection,
        {
          shipmentId: shipment.id,
        },
      );
    typia.assert(confirmedShipment);
  }
  // 8. Customer creates refund request
  const orderItem = order.items[0];
  const refundRequest =
    await api.functional.ecommerceMall.member.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Product quality issue - item damaged upon delivery",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 9. Seller approves refund request
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.seller.refund_requests.update(
      sellerLoginConnection,
      {
        requestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  // Get snapshot ID from approved refund request
  const snapshotId = approvedRefundRequest.id;
  // 10. Super administrator retrieves snapshot
  const superAdminConnection: api.IConnection = { host: connection.host };
  const snapshot =
    await api.functional.ecommerceMall.superAdministrator.refund_request_snapshots.at(
      superAdminConnection,
      {
        id: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.equals("order item id", snapshot.order_item_id, orderItem.id);
  TestValidator.equals("status", snapshot.status, "approved");
  TestValidator.equals(
    "reason",
    snapshot.reason,
    "Product quality issue - item damaged upon delivery",
  );
  TestValidator.equals(
    "created at",
    snapshot.created_at,
    refundRequest.created_at,
  );
  TestValidator.predicate(
    "snapshot at populated",
    snapshot.snapshot_at !== undefined,
  );
  TestValidator.predicate(
    "responded at populated",
    snapshot.responded_at !== undefined,
  );
  TestValidator.equals(
    "approved by seller id",
    snapshot.approved_by_seller_id,
    seller.id,
  );
  // Validate enriched order item data
  TestValidator.predicate(
    "order item populated",
    snapshot.order_item !== undefined,
  );
  if (snapshot.order_item) {
    TestValidator.equals(
      "order number",
      snapshot.order_item.order_number,
      order.order_number,
    );
    TestValidator.equals(
      "seller display name",
      snapshot.order_item.seller_display_name,
      seller.display_name,
    );
    TestValidator.equals(
      "product variant name",
      snapshot.order_item.product_variant_name,
      products.name,
    );
  }
  // Validate approved by seller data
  TestValidator.predicate(
    "approved by seller populated",
    snapshot.approved_by_seller !== undefined,
  );
  if (snapshot.approved_by_seller) {
    TestValidator.equals(
      "approved by seller id",
      snapshot.approved_by_seller.id,
      seller.id,
    );
    TestValidator.equals(
      "approved by seller display name",
      snapshot.approved_by_seller.display_name,
      seller.display_name,
    );
  }
  // Validate snapshot immutability - retrieve again
  const retrievedSnapshot =
    await api.functional.ecommerceMall.superAdministrator.refund_request_snapshots.at(
      superAdminConnection,
      {
        id: snapshotId,
      },
    );
  typia.assert(retrievedSnapshot);
  TestValidator.equals(
    "snapshot immutable",
    retrievedSnapshot.status,
    "approved",
  );
}
