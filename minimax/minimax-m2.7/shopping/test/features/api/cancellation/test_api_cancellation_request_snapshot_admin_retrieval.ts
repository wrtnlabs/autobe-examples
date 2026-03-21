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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

export async function test_api_cancellation_request_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create seller account with stored credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string & tags.Format<"password">,
    },
  });
  typia.assert(seller);
  // 3. Approve the seller
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: seller.id,
        status: "approved",
      },
    },
  );
  // Login as approved seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create product with variant and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      approvedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_values: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Add inventory to variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    approvedSellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >() satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
        reason: "Initial stock",
      },
    },
  );
  // 5. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 6. Add item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >() satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    },
  );
  // Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 7. Place order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(8),
          address_id: checkoutPrepare.shippingAddress?.id,
        },
      },
    );
  typia.assert(order);
  // Get order item ID
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 8. Customer submits cancellation request
  const cancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(cancellationList);
  const cancellationRequest = cancellationList.data.find(
    (cr) => cr.orderItem.id === orderItem.id,
  );
  TestValidator.equals(
    "cancellation request exists",
    !!cancellationRequest,
    true,
  );
  // 9. Seller approves the cancellation request (this creates the snapshot)
  const approvedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      approvedSellerConnection,
      {
        requestId: cancellationRequest!.id,
      },
    );
  typia.assert(approvedCancellation);
  // Get the snapshot ID from the approved cancellation
  const snapshotId = approvedCancellation.snapshots[0]?.id;
  TestValidator.equals("snapshot exists", !!snapshotId, true);
  // Test execution: Admin retrieves the snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId!,
      },
    );
  typia.assert(snapshot);
  // Validation: Snapshot has correct structure
  TestValidator.equals(
    "snapshot has id",
    typeof snapshot.id === "string",
    true,
  );
  TestValidator.equals(
    "snapshot has cancellation_request",
    !!snapshot.cancellation_request,
    true,
  );
  TestValidator.equals(
    "snapshot has reason",
    typeof snapshot.reason === "string",
    true,
  );
  TestValidator.equals(
    "snapshot has status",
    snapshot.status === "approved" || snapshot.status === "rejected",
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    typeof snapshot.created_at === "string",
    true,
  );
  // Validation: Nested cancellation_request is properly populated
  TestValidator.equals(
    "cancellation_request has customer",
    !!snapshot.cancellation_request.customer,
    true,
  );
  TestValidator.equals(
    "cancellation_request has seller",
    !!snapshot.cancellation_request.seller,
    true,
  );
  TestValidator.equals(
    "cancellation_request has orderItem",
    !!snapshot.cancellation_request.orderItem,
    true,
  );
  TestValidator.equals(
    "cancellation_request status is approved",
    snapshot.cancellation_request.status,
    "approved",
  );
  // Validation: Reason is preserved from original request
  TestValidator.equals(
    "reason matches original",
    snapshot.reason,
    cancellationRequest!.reason,
  );
}
