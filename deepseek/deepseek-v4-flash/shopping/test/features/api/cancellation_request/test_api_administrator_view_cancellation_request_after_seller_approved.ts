import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_cancellation_requests_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_administrator_view_cancellation_request_after_seller_approved(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup connections for three actors ----
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Administrator joins
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Seller joins (approval_status = 'pending')
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves seller
  const approvedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: 50000,
        category_id: null,
      },
    },
  );
  // 6. Seller creates a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(16),
          price: null,
          options: [
            {
              key: "color",
              value: "Red",
            } satisfies IECommerceMallProductVariant.IOption,
            {
              key: "size",
              value: "Large",
            } satisfies IECommerceMallProductVariant.IOption,
          ],
        },
      },
    );
  // 7. Seller restocks inventory
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "initial stock",
      },
    },
  );
  // 8. Customer joins
  await authorize_customer_join(customerConnection, {});
  // 9. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state_province: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        },
      },
    );
  // 10. Customer adds variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // 11. Customer places an order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  // 12. Extract the order item id
  const orderItem = order.orderItems[0];
  // 13. Customer creates a cancellation request
  const cancellationRequest =
    await generate_random_e_commerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Changed my mind",
        },
      },
    );
  // 14. Seller approves the cancellation request
  const sellerResponse =
    await api.functional.eCommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(sellerResponse);
  // 15. Administrator retrieves the cancellation request
  const adminView =
    await api.functional.eCommerceMall.administrator.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(adminView);
  // ---- Business logic validations ----
  TestValidator.equals("id matches", adminView.id, cancellationRequest.id);
  TestValidator.equals("status is approved", adminView.status, "approved");
  TestValidator.equals("reason matches", adminView.reason, "Changed my mind");
  TestValidator.predicate(
    "responded_at is non-null",
    () =>
      adminView.responded_at !== null && adminView.responded_at !== undefined,
  );
  TestValidator.predicate(
    "seller is populated",
    () => adminView.seller !== null && adminView.seller !== undefined,
  );
  TestValidator.predicate(
    "customer is populated",
    () => adminView.customer !== null && adminView.customer !== undefined,
  );
  TestValidator.predicate(
    "orderItem has product_name",
    () => adminView.orderItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "orderItem has variant_sku",
    () => adminView.orderItem.variant_sku.length > 0,
  );
  TestValidator.predicate(
    "orderItem has variant_options",
    () => adminView.orderItem.variant_options.length > 0,
  );
  TestValidator.predicate(
    "orderItem has shop_name",
    () => adminView.orderItem.shop_name.length > 0,
  );
  TestValidator.equals(
    "orderItem quantity is 1",
    adminView.orderItem.quantity,
    1,
  );
  TestValidator.predicate(
    "snapshots array is non-empty",
    () => adminView.snapshots.length > 0,
  );
  TestValidator.equals(
    "snapshot reason matches",
    adminView.snapshots[0]!.reason,
    "Changed my mind",
  );
  TestValidator.equals(
    "snapshot status is approved",
    adminView.snapshots[0]!.status,
    "approved",
  );
  TestValidator.predicate(
    "snapshot has created_at",
    () => adminView.snapshots[0]!.created_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid",
    () => adminView.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    () => adminView.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", adminView.deleted_at, null);
}
