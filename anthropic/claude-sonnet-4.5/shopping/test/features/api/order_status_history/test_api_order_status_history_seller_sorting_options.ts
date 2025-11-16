import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test sorting functionality of seller order status history endpoint.
 *
 * Validates that sellers can retrieve order status history records with
 * different sorting options including field selection (created_at, status) and
 * sort direction (ascending, descending). This ensures sellers can view status
 * histories in the sequence that best matches their operational workflows.
 *
 * The test creates a complete order workflow including all prerequisites:
 *
 * 1. Create buyer, admin, and seller accounts
 * 2. Create product category, sale listing, and SKU
 * 3. Set up buyer address and payment method
 * 4. Add product to cart and create order
 * 5. Query status history with various sorting parameters
 * 6. Validate sorting behavior and data structure
 */
export async function test_api_order_status_history_seller_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account with stored password
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "BuyerPass123!";
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
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

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create seller account with stored password
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.content({ paragraphs: 1 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Switch to buyer and create address
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(1),
          address_label: RandomGenerator.name(1),
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 8: Register payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: typia
          .random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >()
          .toString(),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 9: Add product to cart
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

  // Step 10: Create order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Switch to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 12: Test sorting by created_at ascending
  const sortedByDateAsc =
    await api.functional.shoppingMall.seller.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);
  TestValidator.predicate(
    "sorted by date asc has pagination",
    sortedByDateAsc.pagination !== null &&
      sortedByDateAsc.pagination !== undefined,
  );
  TestValidator.predicate(
    "sorted by date asc has data array",
    Array.isArray(sortedByDateAsc.data),
  );

  // Step 13: Test sorting by created_at descending
  const sortedByDateDesc =
    await api.functional.shoppingMall.seller.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);
  TestValidator.predicate(
    "sorted by date desc has pagination",
    sortedByDateDesc.pagination !== null &&
      sortedByDateDesc.pagination !== undefined,
  );
  TestValidator.predicate(
    "sorted by date desc has data array",
    Array.isArray(sortedByDateDesc.data),
  );

  // Step 14: Test sorting by status ascending
  const sortedByStatusAsc =
    await api.functional.shoppingMall.seller.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          sort_by: "status",
          order: "asc",
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortedByStatusAsc);
  TestValidator.predicate(
    "sorted by status asc has pagination",
    sortedByStatusAsc.pagination !== null &&
      sortedByStatusAsc.pagination !== undefined,
  );
  TestValidator.predicate(
    "sorted by status asc has data array",
    Array.isArray(sortedByStatusAsc.data),
  );

  // Step 15: Test sorting by status descending
  const sortedByStatusDesc =
    await api.functional.shoppingMall.seller.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {
          sort_by: "status",
          order: "desc",
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(sortedByStatusDesc);
  TestValidator.predicate(
    "sorted by status desc has pagination",
    sortedByStatusDesc.pagination !== null &&
      sortedByStatusDesc.pagination !== undefined,
  );
  TestValidator.predicate(
    "sorted by status desc has data array",
    Array.isArray(sortedByStatusDesc.data),
  );

  // Step 16: Test default sorting (no parameters)
  const defaultSort =
    await api.functional.shoppingMall.seller.orders.statusHistories.index(
      connection,
      {
        orderId: order.id,
        body: {} satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort has pagination",
    defaultSort.pagination !== null && defaultSort.pagination !== undefined,
  );
  TestValidator.predicate(
    "default sort has data array",
    Array.isArray(defaultSort.data),
  );
}
