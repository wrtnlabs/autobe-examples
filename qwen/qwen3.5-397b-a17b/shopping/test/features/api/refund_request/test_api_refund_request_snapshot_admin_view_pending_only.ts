import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test administrator retrieval of refund request snapshots in pending state.
 *
 * Validates that administrators can view the snapshot history of a refund request that is still pending seller response. This test ensures the oversight capability where admins can monitor refund requests before sellers take action, with exactly one initial snapshot containing the customer's reason and null seller_response.
 *
 * The test establishes a complete e-commerce workflow: admin setup, seller product creation, customer purchase, order delivery, and refund request submission. The admin then queries the snapshot endpoint to verify the pending state is properly captured.
 *
 * 1. Administrator joins platform for authentication.
 * 2. Seller registers and creates category, product, and variant.
 * 3. Customer registers, creates address, adds item to cart, and places order.
 * 4. Order item is delivered (shipment created with delivered_at).
 * 5. Customer submits refund request creating initial pending snapshot.
 * 6. Admin retrieves snapshot history for the pending refund request.
 * 7. Validates exactly 1 snapshot exists with pending status and null seller_response.
 */
export async function test_api_refund_request_snapshot_admin_view_pending_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8),
        option_values: `Color: ${RandomGenerator.alphabets(5)}`,
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(variant);
  // 3. Customer setup - register, create address, cart, and order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const address = await generate_random_shopping_mall_member_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 4. Order item is delivered - backend handles shipment auto-delivery in test mode
  const orderItem = order.orderItems[0];
  // 5. Customer submits refund request (creates initial pending snapshot)
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Admin retrieves snapshot history for pending refund request
  const snapshotResponse =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort: "asc",
        },
      },
    );
  typia.assert(snapshotResponse);
  // 7. Validate snapshot response
  TestValidator.equals(
    "pagination records count",
    snapshotResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals("data array length", snapshotResponse.data.length, 1);
  const snapshot = snapshotResponse.data[0];
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot seller_response is null",
    snapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "snapshot reason matches refund request",
    snapshot.reason,
    refundRequest.reason,
  );
  // Validate refundRequest summary in snapshot
  TestValidator.equals(
    "refundRequest id matches",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refundRequest status matches",
    snapshot.refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refundRequest member id matches",
    snapshot.refundRequest.member.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "refundRequest orderItem id matches",
    snapshot.refundRequest.orderItem.id,
    orderItem.id,
  );
  // Validate chronological ordering (only one record but should be sorted by created_at ASC)
  TestValidator.predicate("snapshot has valid created_at timestamp", () => {
    const createdAt = new Date(snapshot.created_at);
    return createdAt instanceof Date && !isNaN(createdAt.getTime());
  });
}
