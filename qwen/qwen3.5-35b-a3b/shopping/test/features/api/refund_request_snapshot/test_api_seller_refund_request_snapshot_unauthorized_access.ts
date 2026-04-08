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

/**
 * Test unauthorized access to refund request snapshot.
 *
 * Validates that a seller cannot access refund request snapshots belonging to another seller's order items.
 * The test creates a complete flow where Seller B manages an order with refund request approval,
 * then verifies that Seller A (a different seller) receives a 403 Forbidden error when attempting
 * to access that snapshot.
 *
 * 1. Administrator and two sellers (A and B) are registered and logged in.
 * 2. Seller B creates a product with a variant for order fulfillment.
 * 3. Customer places an order with Seller B's product variant.
 * 4. Customer confirms delivery to enable refund request.
 * 5. Customer submits a refund request for the delivered order item.
 * 6. Seller B approves the refund request, which creates a snapshot.
 * 7. Seller A attempts to access the snapshot, expecting a 403 Forbidden error.
 *
 * This test validates the authorization boundaries between sellers,
 * ensuring sensitive refund request data is not exposed to unauthorized parties.
 */
export async function test_api_seller_refund_request_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup (not directly used, but part of test context)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      display_name: "Admin Tester",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Seller A joins (unauthorized party trying to access snapshot)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: "sellerA@test.com",
      password: "1234",
      display_name: "Seller A",
      href: "http://seller.example.com/join",
      referrer: "http://seller.example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 3. Seller B joins (authorized party - product owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: "sellerB@test.com",
      password: "1234",
      display_name: "Seller B",
      href: "http://seller.example.com/join",
      referrer: "http://seller.example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 4. Seller B logs in for product creation
  const sellerBLogin = await authorize_seller_login(sellerBConnection, {
    body: {
      email: "sellerB@test.com",
      password: "1234",
      href: "http://seller.example.com/login",
      referrer: "http://seller.example.com",
      ip: "192.168.1.100",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerBLogin);
  // 5. Generate a random category ID for product creation
  // (Category creation API is not available in SDK)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 6. Seller B creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerBConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        category_id: categoryId,
        base_price: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Seller B creates product variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerBConnection,
      {
        productId: product.id,
        body: {
          sku_code: "TEST-VARIANT-001",
          option_values: JSON.stringify({ color: "red", size: "L" }),
          stock_quantity: 100,
          price: 15000,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 8. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      href: "http://customer.example.com/join",
      referrer: "http://customer.example.com",
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 9. Customer creates address
  const address =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "Test Customer",
          phone: "01012345678",
          street: "123 Test Street",
          city: "Seoul",
          state: "Seoul",
          postal_code: "06292",
          country: "KR",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 10. Customer creates order with Seller B's product
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
  // 11. Customer confirms delivery (creates shipment)
  const shipment =
    await api.functional.ecommerceMall.member.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: order.shipments[0].id },
    );
  typia.assert(shipment);
  // 12. Customer submits refund request
  const refundRequest =
    await api.functional.ecommerceMall.member.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          order_item_id: order.items[0].id,
          reason: "Defective product received",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 13. Seller B approves refund (creates snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.seller.refund_requests.update(
      sellerBConnection,
      {
        requestId: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefund);
  // Get the refund request snapshot ID from the approved refund
  const snapshotId = approvedRefund.id;
  // 14. Seller A logs in (unauthorized party)
  const sellerALogin = await authorize_seller_login(sellerAConnection, {
    body: {
      email: "sellerA@test.com",
      password: "1234",
      href: "http://seller.example.com/login",
      referrer: "http://seller.example.com",
      ip: "192.168.1.101",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerALogin);
  // 15. Seller A attempts to access another seller's refund snapshot (should fail with 403)
  await TestValidator.error(
    "Seller A cannot access another seller's refund snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.refund_request_snapshots.at(
        sellerAConnection,
        { id: snapshotId },
      );
    },
  );
}
