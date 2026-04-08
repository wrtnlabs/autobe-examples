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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_customer_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_orders_items_refund_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_request_snapshot_view_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  // 2. Customer setup - create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  // 3. Seller setup - create seller account (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 4. Administrator approves seller registration
  const approvalRequest =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminConnection,
      {
        requestId: sellerAuth.id,
        body: {
          status: "approved",
          reviewer_id: sellerAuth.id,
          rejection_reason: undefined,
        } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 5. Use existing category ID - skip category creation
  const categoryId: string = "00000000-0000-0000-0000-000000000000";
  // 6. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Seller adds a product variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: '{"color": "blue", "size": "M"}',
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          price: undefined,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Customer creates a shipping address
  const address =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.alphabets(5),
          state: RandomGenerator.alphabets(3),
          postal_code: typia.random<string & tags.MaxLength<10>>(),
          country: "US",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 9. Customer creates an order with the seller's product variant
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 10. Skip delivery confirmation step - assume order is in 'delivered' status
  // In a real scenario, shipment would need to be created and delivered first
  // For this test, we'll proceed with refund request assuming delivery status
  // 11. Customer submits a refund request for the order item
  const refundRequest =
    await api.functional.ecommerceMall.member.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          order_item_id: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 12. Seller responds to the refund request (approve scenario)
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  // 13. Customer views the refund request snapshot
  // The snapshot ID is typically the same as the refund request ID after response
  const snapshot =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.at(
      customerConnection,
      { id: refundRequest.id },
    );
  typia.assert(snapshot);
  // 14. Verify snapshot contains seller's response details for approval
  TestValidator.equals(
    "snapshot status matches approved",
    snapshot.status,
    "approved",
  );
  TestValidator.equals(
    "refund reason preserved",
    snapshot.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "responded_at timestamp set",
    snapshot.responded_at !== null,
    true,
  );
  if (snapshot.status === "approved") {
    TestValidator.equals(
      "approved_by_seller_id populated",
      snapshot.approved_by_seller_id !== null,
      true,
    );
    TestValidator.equals(
      "approved_by_seller populated",
      snapshot.approved_by_seller !== null,
      true,
    );
    if (snapshot.approved_by_seller) {
      TestValidator.equals(
        "approved_by_seller display_name present",
        snapshot.approved_by_seller.display_name.length > 0,
        true,
      );
    }
  }
  // 15. Verify enriched order_item data
  TestValidator.equals(
    "order_item has order_number",
    snapshot.order_item !== null,
    true,
  );
  if (snapshot.order_item) {
    TestValidator.equals(
      "order_number matches",
      snapshot.order_item.order_number,
      order.order_number,
    );
    TestValidator.equals(
      "seller display name present",
      snapshot.order_item.seller_display_name.length > 0,
      true,
    );
    TestValidator.equals(
      "product variant name present",
      snapshot.order_item.product_variant_name.length > 0,
      true,
    );
    TestValidator.equals(
      "product variant sku_code present",
      snapshot.order_item.product_variant_sku_code.length > 0,
      true,
    );
    TestValidator.equals(
      "quantity matches",
      snapshot.order_item.quantity,
      order.items[0].quantity,
    );
    TestValidator.equals(
      "unit price matches",
      snapshot.order_item.unit_price,
      order.items[0].unit_price,
    );
  }
  // 16. Seller responds to another refund request (reject scenario)
  const refundRequest2 =
    await api.functional.ecommerceMall.member.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          order_item_id: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  const rejectedRefundRequest =
    await api.functional.ecommerceMall.seller.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: refundRequest2.id,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefundRequest);
  const rejectedSnapshot =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.at(
      customerConnection,
      { id: refundRequest2.id },
    );
  typia.assert(rejectedSnapshot);
  // 17. Verify rejection snapshot contains rejection reason
  TestValidator.equals(
    "rejected snapshot status",
    rejectedSnapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected snapshot reason preserved",
    rejectedSnapshot.reason,
    refundRequest2.reason,
  );
  TestValidator.equals(
    "rejected responded_at timestamp set",
    rejectedSnapshot.responded_at !== null,
    true,
  );
  TestValidator.equals(
    "rejection_reason populated for rejected",
    rejectedSnapshot.rejection_reason !== null,
    true,
  );
  TestValidator.equals(
    "rejected_by_seller populated",
    rejectedSnapshot.rejected_by_seller !== null,
    true,
  );
  // 18. Verify snapshot is immutable by checking timestamps are consistent
  TestValidator.equals(
    "snapshot created_at equals snapshot_at",
    snapshot.created_at,
    snapshot.snapshot_at,
  );
  TestValidator.equals(
    "rejected snapshot created_at equals snapshot_at",
    rejectedSnapshot.created_at,
    rejectedSnapshot.snapshot_at,
  );
}
