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

export async function test_api_seller_refund_request_snapshot_view_own_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Setup - Create admin account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller Setup - Create seller account (starts with pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const sellerEmail = sellerAuth.email;
  // 3. Admin approves seller registration
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const adminApproveConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminApproveConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  await api.functional.ecommerceMall.administrator.seller_approvals.update(
    adminApproveConnection,
    {
      requestId: approvalRequestId,
      body: {
        status: "approved" as const,
        reviewer_id: adminAuth.id,
      } satisfies IEcommerceMallSellerApprovalRequest.IUpdate,
    },
  );
  // 4. Seller login with approved account
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  // 5. Customer Setup - Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerAuth);
  // Create customer shipping address
  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: typia.random<string & tags.Format<"uri">>(),
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  // 6. Seller creates product (needs admin-created category)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
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
  // 7. Seller creates product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "red", size: "L" }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          price: product.base_price,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  // 8. Customer creates order
  const order = await generate_random_ecommerce_mall_member_orders_create(
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
  // 9. Confirm shipment delivery (if shipment exists)
  if (order.shipments.length > 0) {
    const shipment = order.shipments[0];
    const customerDeliveryConnection: api.IConnection = {
      host: connection.host,
    };
    await authorize_member_login(customerDeliveryConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.ILogin,
    });
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerDeliveryConnection,
      { shipmentId: shipment.id },
    );
  }
  // 10. Customer submits refund request
  const orderId = order.id;
  const itemId = order.items[0].id;
  const refundRequest =
    await generate_random_ecommerce_mall_member_customer_orders_items_refund_create(
      customerConnection,
      {
        body: {
          order_item_id: itemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
        params: { orderId, itemId },
      },
    );
  typia.assert(refundRequest);
  // 11. Seller approves refund request (creates snapshot)
  const requestId = refundRequest.id;
  const sellerApproveConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerApproveConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const updatedRefundRequest =
    await api.functional.ecommerceMall.seller.seller.refund_requests.update(
      sellerApproveConnection,
      {
        requestId,
        body: {
          status: "approved" as const,
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 12. Seller retrieves snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.at(
      sellerApproveConnection,
      { id: requestId },
    );
  typia.assert(snapshot);
  // 13. Validate snapshot data
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is populated",
    snapshot.responded_at !== null && snapshot.responded_at !== undefined,
  );
  TestValidator.equals(
    "approved_by_seller_id matches seller",
    snapshot.approved_by_seller_id,
    sellerId,
  );
  TestValidator.predicate(
    "order_item is enriched",
    snapshot.order_item !== null && snapshot.order_item !== undefined,
  );
  if (snapshot.order_item) {
    TestValidator.predicate(
      "order_item has order_number",
      snapshot.order_item.order_number !== undefined,
    );
    TestValidator.predicate(
      "order_item has seller_display_name",
      snapshot.order_item.seller_display_name !== undefined,
    );
  }
  TestValidator.predicate(
    "approved_by_seller is populated",
    snapshot.approved_by_seller !== null &&
      snapshot.approved_by_seller !== undefined,
  );
  if (snapshot.approved_by_seller) {
    TestValidator.equals(
      "approved_by_seller display_name matches",
      snapshot.approved_by_seller.display_name,
      sellerAuth.display_name,
    );
  }
  TestValidator.equals(
    "rejection_reason is null",
    snapshot.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "snapshot_at is populated",
    snapshot.snapshot_at !== null && snapshot.snapshot_at !== undefined,
  );
}
