import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that deleted reviews are excluded from listing results while preserving data integrity.
 *
 * Validates the complete review lifecycle including seller product setup, member order placement, shipment delivery, review creation, review deletion, and verification that deleted reviews are properly excluded from listing results.
 *
 * The test ensures that soft-deleted reviews are not returned in the review listing endpoint and that pagination metadata correctly reflects only non-deleted reviews. This validates the core business logic that deleted content should be hidden from public views while maintaining data integrity for audit purposes.
 *
 * 1. Seller creates and authenticates account, creates product with variant.
 * 2. Member creates and authenticates account, places first order.
 * 3. Seller ships first order, member creates first review (rating 5).
 * 4. Member places second order, seller ships, member creates second review (rating 3).
 * 5. Member deletes first review.
 * 6. List reviews filtered by product_id, verify only 1 review returned (the non-deleted one).
 * 7. Verify pagination shows records=1 and remaining review has rating 3.
 */
export async function test_api_review_listing_excludes_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Create product and variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id:
          typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoin);
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(memberLogin);
  // 4. First order - member places order
  const firstOrder = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id:
          typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(firstOrder);
  // Get first order item for review
  const firstOrderItem = firstOrder.orderItems[0];
  typia.assert(firstOrderItem);
  // Seller creates shipment for first order
  const firstShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: firstOrder.id,
        body: {
          order_item_ids: [firstOrderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(firstShipment);
  // Member creates first review (will be deleted) - rating 5
  const firstReview = await api.functional.shoppingMall.member.reviews.create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: firstOrder.id,
        shopping_mall_order_item_id: firstOrderItem.id,
        rating: 5,
        content: "First review - will be deleted",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(firstReview);
  // 5. Second order - member places another order for same product
  const secondOrder = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id:
          typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(secondOrder);
  const secondOrderItem = secondOrder.orderItems[0];
  typia.assert(secondOrderItem);
  // Seller creates shipment for second order
  const secondShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: secondOrder.id,
        body: {
          order_item_ids: [secondOrderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(secondShipment);
  // Member creates second review (will remain) - rating 3
  const secondReview = await api.functional.shoppingMall.member.reviews.create(
    memberConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: secondOrder.id,
        shopping_mall_order_item_id: secondOrderItem.id,
        rating: 3,
        content: "Second review - will remain",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(secondReview);
  // 6. Delete first review
  await api.functional.shoppingMall.member.reviews.erase(memberConnection, {
    reviewId: firstReview.id,
  });
  // 7. Test execution - List reviews filtered by product_id
  const reviewList = await api.functional.shoppingMall.reviews.index(
    memberConnection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewList);
  // Validate results
  TestValidator.equals("review count", reviewList.data.length, 1);
  TestValidator.equals("pagination records", reviewList.pagination.records, 1);
  TestValidator.equals(
    "remaining review rating",
    reviewList.data[0]!.rating,
    3,
  );
  TestValidator.notEquals(
    "deleted review excluded",
    reviewList.data[0]!.id,
    firstReview.id,
  );
  TestValidator.equals(
    "remaining review is second review",
    reviewList.data[0]!.id,
    secondReview.id,
  );
}