import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_review_snapshot_deleted_review_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & typia.tags.Minimum<1> & typia.tags.Maximum<1000000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 5. Add inventory
  const variant = product.variants[0];
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 7. Create address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 8. Add to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 9. Checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 10. Ship order
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "Test Carrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order.id,
          orderItemIds: order.orderItems.map((item) => item.id),
        },
      },
    );
  typia.assert(shipment);
  // 11. Confirm delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 12. Create review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItem: order.orderItems[0].id,
        rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review);
  // 13. Edit review twice to create snapshots
  const firstEdit = await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
        content: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  typia.assert(firstEdit);
  const secondEdit = await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(secondEdit);
  // 14. Delete review
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 15. Administrator retrieves snapshots for deleted review
  const snapshots =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
        },
      },
    );
  typia.assert(snapshots);
  // 16. Validate snapshots preserved after review deletion
  TestValidator.predicate(
    "snapshots preserved after review deletion",
    snapshots.data.length === 2,
  );
  // Validate chronological order
  TestValidator.predicate(
    "snapshots in chronological order",
    snapshots.data.length < 2 ||
      new Date(snapshots.data[0].created_at) <=
        new Date(snapshots.data[1].created_at),
  );
  // Validate each snapshot has valid rating
  for (const snapshot of snapshots.data) {
    TestValidator.predicate(
      "snapshot has valid rating",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
  }
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    snapshots.pagination.records === snapshots.data.length,
  );
}
