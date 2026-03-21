import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_request_snapshot_multiple_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for seller approvals
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  // 3. Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  // 4. Admin approves both sellers
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: (adminAuth as any).token?.access ?? ("admin123" as any),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminLoginConnection,
    {
      body: {
        sellerId: seller1Auth.id,
        status: "approved" as const,
      },
    },
  );
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminLoginConnection,
    {
      body: {
        sellerId: seller2Auth.id,
        status: "approved" as const,
      },
    },
  );
  // 5. First seller logs in and creates product
  const seller1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1LoginConnection, {
    body: {
      email: seller1Auth.email,
      password: (seller1Auth as any).token?.access ?? ("seller123" as any),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1LoginConnection,
    {},
  );
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      seller1LoginConnection,
      {
        params: { productId: product1.id },
      },
    );
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller1LoginConnection,
    {
      params: { productId: product1.id, variantId: variant1.id },
      body: {
        operation: "restock" as const,
        quantity: 10 as any,
        reason: "Initial stock",
      },
    },
  );
  // 6. Second seller logs in and creates product
  const seller2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2LoginConnection, {
    body: {
      email: seller2Auth.email,
      password: (seller2Auth as any).token?.access ?? ("seller123" as any),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2LoginConnection,
    {},
  );
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      seller2LoginConnection,
      {
        params: { productId: product2.id },
      },
    );
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller2LoginConnection,
    {
      params: { productId: product2.id, variantId: variant2.id },
      body: {
        operation: "restock" as const,
        quantity: 10 as any,
        reason: "Initial stock",
      },
    },
  );
  // 7. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 8. Customer creates shipping address
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: (customerAuth as any).token?.access ?? ("customer123" as any),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  await generate_random_ecommerce_mall_customer_customers_addresses_create(
    customerLoginConnection,
    {
      body: {
        recipient_name: "Test Customer",
        phone: "01012345678",
        street_address: "123 Test Street",
        city: "Test City",
        state: "Test State",
        postal_code: "12345",
        country: "Test Country",
        is_default: true,
      },
    },
  );
  // 9. Customer adds first item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerLoginConnection,
    {
      body: {
        variant_id: variant1.id,
        quantity: 1 as any,
      },
    },
  );
  // 10. Customer places first order
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerLoginConnection,
  );
  const order1 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token",
        },
      },
    );
  typia.assert(order1);
  // 11. Customer adds second item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerLoginConnection,
    {
      body: {
        variant_id: variant2.id,
        quantity: 1 as any,
      },
    },
  );
  // 12. Customer places second order
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerLoginConnection,
  );
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token",
        },
      },
    );
  typia.assert(order2);
  // 13. Get cancellation requests for customer
  const cancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerLoginConnection,
      {
        body: {
          customer_id: customerAuth.id,
        },
      },
    );
  typia.assert(cancellationList);
  // Find pending cancellation for first order
  const orderItem1Id = order1.orderItems[0]?.id;
  const pendingCancellation1 = cancellationList.data.find(
    (c) => c.orderItem.id === orderItem1Id && c.status === "pending",
  );
  // Find pending cancellation for second order
  const orderItem2Id = order2.orderItems[0]?.id;
  const pendingCancellation2 = cancellationList.data.find(
    (c) => c.orderItem.id === orderItem2Id && c.status === "pending",
  );
  // 14. First seller approves first cancellation
  await api.functional.ecommerceMall.seller.cancellation_requests.approve(
    seller1LoginConnection,
    {
      requestId: pendingCancellation1!.id,
    },
  );
  // 15. Second seller rejects second cancellation
  await api.functional.ecommerceMall.seller.cancellation_requests.reject(
    seller2LoginConnection,
    {
      requestId: pendingCancellation2!.id,
      body: {
        reason: "Cannot cancel after processing",
      },
    },
  );
  // 16. List snapshots for first cancellation to get snapshot ID
  const snapshots1 =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerLoginConnection,
      {
        requestId: pendingCancellation1!.id,
        body: {},
      },
    );
  typia.assert(snapshots1);
  // 17. List snapshots for second cancellation to get snapshot ID
  const snapshots2 =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerLoginConnection,
      {
        requestId: pendingCancellation2!.id,
        body: {},
      },
    );
  typia.assert(snapshots2);
  // 18. Customer retrieves first snapshot (approved)
  const snapshot1Id = snapshots1.data[0]?.id;
  const snapshot1 =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.at(
      customerLoginConnection,
      {
        snapshotId: snapshot1Id!,
      },
    );
  typia.assert(snapshot1);
  // 19. Customer retrieves second snapshot (rejected)
  const snapshot2Id = snapshots2.data[0]?.id;
  const snapshot2 =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.at(
      customerLoginConnection,
      {
        snapshotId: snapshot2Id!,
      },
    );
  typia.assert(snapshot2);
  // 20. Validations
  TestValidator.equals(
    "first snapshot status is approved",
    snapshot1.status,
    "approved",
  );
  TestValidator.equals(
    "second snapshot status is rejected",
    snapshot2.status,
    "rejected",
  );
  TestValidator.notEquals(
    "first snapshot has unique id",
    snapshot1.id,
    snapshot2.id,
  );
  TestValidator.equals(
    "first snapshot references correct cancellation request",
    snapshot1.cancellation_request.id,
    pendingCancellation1!.id,
  );
  TestValidator.equals(
    "second snapshot references correct cancellation request",
    snapshot2.cancellation_request.id,
    pendingCancellation2!.id,
  );
}
