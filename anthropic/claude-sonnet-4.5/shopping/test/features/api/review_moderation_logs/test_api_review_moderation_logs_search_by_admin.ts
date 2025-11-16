import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewModerationLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallReviewModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationLog";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive admin search and filtering of review moderation logs.
 *
 * This test validates the complete workflow enabling administrators to search
 * and retrieve moderation log audit trails for product reviews. The scenario
 * establishes a multi-actor e-commerce workflow including admin setup, product
 * category creation, seller product listing, buyer purchase completion, and
 * review submission, culminating in admin moderation log retrieval with various
 * filtering and sorting options.
 *
 * The test ensures admins can access comprehensive audit trails showing:
 *
 * - Who performed moderation actions (moderator identity)
 * - When actions occurred (timestamps with date filtering)
 * - What actions were taken (action types: auto_approved, manual_approved, etc.)
 * - Status transitions (previous and new status filtering)
 * - Pagination for large audit histories
 * - Flexible sorting by timestamp or action type
 *
 * Workflow steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create product category structure
 * 3. Switch to seller, create product sale and SKU variant
 * 4. Switch to buyer, complete purchase workflow (address, payment, cart, order)
 * 5. Submit product review (generates moderation log entries)
 * 6. Switch back to admin context
 * 7. Search moderation logs with pagination
 * 8. Test various filtering options
 * 9. Validate sorting and pagination metadata
 */
export async function test_api_review_moderation_logs_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(4),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Create delivery address for buyer
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(2),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(2),
          address_label: RandomGenerator.pick([
            "Home",
            "Office",
            "Other",
          ] as const),
          address_type: RandomGenerator.pick([
            "residential",
            "commercial",
          ] as const),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 8: Register payment method for buyer
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: RandomGenerator.pick([
          "visa",
          "mastercard",
          "amex",
        ] as const),
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(6),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Add product SKU to shopping cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 10: Create order from cart items
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Submit product review for the order
  const review = await api.functional.shoppingMall.buyer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_sale_id: sale.id,
        shopping_mall_sale_sku_id: sku.id,
        shopping_mall_order_id: order.id,
        star_rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        review_title: RandomGenerator.paragraph({ sentences: 3 }),
        review_body: RandomGenerator.content({ paragraphs: 2 }),
        is_anonymous: RandomGenerator.pick([true, false] as const),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 12: Switch back to admin context to search moderation logs
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 13: Search moderation logs with basic pagination
  const moderationLogs =
    await api.functional.shoppingMall.admin.reviews.moderationLogs.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallReviewModerationLog.IRequest,
      },
    );
  typia.assert(moderationLogs);

  // Validate pagination structure
  TestValidator.predicate(
    "moderation logs pagination has valid current page",
    moderationLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "moderation logs pagination has valid limit",
    moderationLogs.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "moderation logs data is an array",
    Array.isArray(moderationLogs.data),
  );

  // Step 14: Test filtering by action type
  const selectedActionType = RandomGenerator.pick([
    "auto_approved",
    "auto_flagged",
    "manual_approved",
    "manual_rejected",
  ] as const);
  const actionTypeFiltered =
    await api.functional.shoppingMall.admin.reviews.moderationLogs.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 50,
          action_type: selectedActionType,
        } satisfies IShoppingMallReviewModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeFiltered);

  // Validate filter was applied correctly
  if (actionTypeFiltered.data.length > 0) {
    TestValidator.predicate(
      "action type filter was applied correctly",
      actionTypeFiltered.data.every(
        (log) => log.action_type === selectedActionType,
      ),
    );
  }

  // Step 15: Test filtering by status transitions
  const statusFiltered =
    await api.functional.shoppingMall.admin.reviews.moderationLogs.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 50,
          previous_status: RandomGenerator.pick([
            "pending_moderation",
            "approved",
            "rejected",
          ] as const),
          new_status: RandomGenerator.pick([
            "pending_moderation",
            "approved",
            "rejected",
          ] as const),
        } satisfies IShoppingMallReviewModerationLog.IRequest,
      },
    );
  typia.assert(statusFiltered);

  // Step 16: Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFiltered =
    await api.functional.shoppingMall.admin.reviews.moderationLogs.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 50,
          from: pastDate.toISOString(),
          to: now.toISOString(),
        } satisfies IShoppingMallReviewModerationLog.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);

  // Step 17: Test sorting by created_at descending
  const sortedByDate =
    await api.functional.shoppingMall.admin.reviews.moderationLogs.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 50,
          sort_by: "created_at",
          order: "desc",
        } satisfies IShoppingMallReviewModerationLog.IRequest,
      },
    );
  typia.assert(sortedByDate);

  // Step 18: Test sorting by action_type ascending
  const sortedByAction =
    await api.functional.shoppingMall.admin.reviews.moderationLogs.index(
      connection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 50,
          sort_by: "action_type",
          order: "asc",
        } satisfies IShoppingMallReviewModerationLog.IRequest,
      },
    );
  typia.assert(sortedByAction);

  // Step 19: Validate moderation log summary structure if logs exist
  if (moderationLogs.data.length > 0) {
    const firstLog = moderationLogs.data[0];

    TestValidator.predicate(
      "moderation log has valid review ID",
      firstLog.shopping_mall_review_id === review.id,
    );
    TestValidator.predicate(
      "moderation log has valid action type",
      [
        "auto_approved",
        "auto_flagged",
        "manual_approved",
        "manual_rejected",
        "edited_by_admin",
        "deleted_by_admin",
        "deleted_by_buyer",
        "restored",
      ].includes(firstLog.action_type),
    );
    TestValidator.predicate(
      "moderation log has valid new status",
      ["pending_moderation", "approved", "rejected"].includes(
        firstLog.new_status,
      ),
    );
    TestValidator.predicate(
      "moderation log includes moderator information",
      firstLog.moderator !== null && firstLog.moderator !== undefined,
    );

    // Validate moderator summary structure
    if (firstLog.moderator) {
      TestValidator.predicate(
        "moderator has valid email",
        typeof firstLog.moderator.email === "string" &&
          firstLog.moderator.email.length > 0,
      );
      TestValidator.predicate(
        "moderator has valid admin level",
        ["super_admin", "moderator", "support"].includes(
          firstLog.moderator.admin_level,
        ),
      );
    }
  }
}
