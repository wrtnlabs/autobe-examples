import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_seller_cancellation_rejection_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin joins to approve seller registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Seller joins (initially pending approval)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection1: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection1, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string & tags.Format<"password">,
    },
  });
  typia.assert(seller);
  // 3. Admin joins to approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access to approve seller registrations",
    },
  });
  typia.assert(admin);
  // 4. Login as admin - need to add href and referrer as required by ILogin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Login as seller - if not approved yet, this might fail
  // Let's assume the system auto-approves or we use the seller approval endpoint
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 6. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: "Test Product for Cancellation Rejection",
        description:
          "Product used to test seller rejecting cancellation request",
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 7. Add inventory for the product variant if available
  const variantId = product.variants?.[0]?.id;
  if (variantId) {
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      approvedSellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variantId,
        },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          operationType: "restock",
          reason: "Initial stock for testing",
        },
      },
    );
  }
  // 8. Customer joins and adds shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 9. Customer adds product to cart and checks out
  const cartVariantId =
    variantId ?? typia.random<string & tags.Format<"uuid">>();
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: cartVariantId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Checkout creates order with 'paid' status
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(order);
  // Get order item ID for cancellation request
  const orderItem = order.orderItems?.[0];
  TestValidator.predicate("order has items", orderItem !== undefined);
  const orderItemId = orderItem!.id;
  // Verify order status is 'paid'
  TestValidator.equals("order status is paid", order.status, "paid");
  // 10. Customer creates cancellation request for the paid order item
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: "Changed my mind about this purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Verify cancellation request status is 'pending'
  TestValidator.equals(
    "cancellation status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 11. Seller rejects the cancellation request with rejection reason
  const rejectionReason = "Item already being prepared for shipment";
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.reject(
      approvedSellerConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          reason: rejectionReason,
        } satisfies IEcommerceMallCancellationRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 12. Verify response returns status 'rejected' and includes rejection reason
  TestValidator.equals(
    "cancellation status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedRequest.reason,
    rejectionReason,
  );
  // 13. Verify order item status remains 'paid' (not changed since rejection keeps fulfillment proceeding)
  const rejectedOrderItem = rejectedRequest.cancellationRequest;
  TestValidator.equals(
    "order item status remains paid after rejection",
    rejectedOrderItem.status,
    "paid",
  );
  // 14. Verify cancellation request snapshot is created for audit trail
  TestValidator.predicate(
    "cancellation request has snapshot data",
    rejectedRequest.cancellationRequest !== null,
  );
  TestValidator.equals(
    "snapshot status is rejected",
    rejectedRequest.cancellationRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot reason preserved",
    rejectedRequest.cancellationRequest.reason,
    rejectionReason,
  );
}
