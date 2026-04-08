import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
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
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_snapshot_customer_view_own_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    { sellerId: sellerAuth.id },
  );
  // 2. Seller creates product with variant and inventory
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: categoryId,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: [{ key: "Size", value: "Large" }],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "Initial stock for testing",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 3. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 4. Customer adds product to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Create order with shipping address
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: customerAuth.shippingAddresses[0]!.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 6. Get order item ID and shipment ID
  const orderItemId = order.orderItems[0]!.id;
  const shipmentId = order.shipments[0]!.id;
  // 7. Confirm delivery to make order item eligible for review
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipmentId,
    },
  );
  // 8. Customer creates review for delivered item
  const review =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.review.create(
      customerConnection,
      {
        itemId: orderItemId,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 9. Customer edits review multiple times to create snapshots
  // First edit
  const firstEdit =
    await api.functional.ecommerceMall.customer.customers.me.reviews.patchByReviewid(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(firstEdit);
  // Second edit
  const secondEdit =
    await api.functional.ecommerceMall.customer.customers.me.reviews.patchByReviewid(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(secondEdit);
  // 10. Customer retrieves review snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 11. Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(snapshotsResponse.data),
    true,
  );
  // 12. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is valid",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 13. Validate snapshots are ordered by created_at descending (newest first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = new Date(snapshotsResponse.data[i]!.created_at).getTime();
      const next = new Date(
        snapshotsResponse.data[i + 1]!.created_at,
      ).getTime();
      TestValidator.predicate(
        `Snapshot ${i} created_at >= Snapshot ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 14. Validate each snapshot contains required fields
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      "snapshot has id",
      snapshot.id !== undefined && snapshot.id !== null,
    );
    TestValidator.predicate(
      "snapshot rating is between 1-5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
  }
  // 15. Validate total records matches data length
  TestValidator.equals(
    "records count matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
}
