import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_request_rejected_for_another_customer_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin joins and logs in
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Seller (actorType: seller) submits admin request and gets approved by SuperAdmin
  const sellerAsAdminConnection: api.IConnection = { host: connection.host };
  const adminRequest = await authorize_admin_join(sellerAsAdminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access to manage platform",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminRequest);
  // Get the admin request ID from the created request
  // Note: In real scenario, SuperAdmin would list pending requests
  // For E2E test, we assume the most recent request matches
  const adminRequestId = (adminRequest as any).requestId ?? superAdmin.id;
  // SuperAdmin approves the admin request
  await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
    superAdminConnection,
    {
      requestId: adminRequestId,
    },
  );
  // 3. Admin (now approved) creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "AdminPass123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic products",
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Seller registers and gets approved by Admin
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection1, {
    body: {
      email: "seller@test.com",
      password: "SellerPass123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Admin approves seller
  await api.functional.ecommerceMall.admin.admin.seller_approvals.approve(
    adminConnection,
    {
      approvalId: sellerJoin.id,
    },
  );
  // 5. Approved seller creates product
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection2, {
    body: {
      email: "seller@test.com",
      password: "SellerPass123!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection2,
    {
      body: {
        name: "Test Product",
        description: "A test product for refund testing",
        categoryId: category.id,
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Customer A registers, adds address and product to cart
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: "customerA@test.com",
      password: "CustomerPass123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // Customer A adds shipping address
  await api.functional.ecommerceMall.customer.customers.addresses.create(
    customerAConnection,
    {
      body: {
        recipientName: "Customer A",
        phone: "010-1234-5678",
        streetAddress: "123 Test Street",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "Korea",
        isDefault: true,
      } satisfies IEcommerceMallShippingAddress.ICreate,
    },
  );
  // Customer A adds product to cart
  await api.functional.ecommerceMall.customer.customers.cart.items.create(
    customerAConnection,
    {
      body: {
        productVariantId: product.variants[0].id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 7. Customer A completes checkout
  const order =
    await api.functional.ecommerceMall.customer.customers.checkout.create(
      customerAConnection,
      {
        body: {} satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  const orderItemId = order.orderItems[0].id;
  // 8. Seller ships the order
  await api.functional.ecommerceMall.seller.orders.shipments.create(
    sellerConnection2,
    {
      orderId: order.id,
      body: {
        orderItemIds: [orderItemId],
        carrier: "DHL",
        trackingNumber: "1234567890",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  // 9. Customer B registers (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: "customerB@test.com",
      password: "CustomerBPass123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Test Execution: Customer B attempts to create refund request for Customer A's order item
  await TestValidator.error(
    "refund request rejected for another customer's order",
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.create(
        customerBConnection,
        {
          body: {
            orderItemId: orderItemId,
            sellerId: sellerJoin.id,
            reason: "Item damaged",
          } satisfies IEcommerceMallRefundRequest.ICreate,
        },
      );
    },
  );
}