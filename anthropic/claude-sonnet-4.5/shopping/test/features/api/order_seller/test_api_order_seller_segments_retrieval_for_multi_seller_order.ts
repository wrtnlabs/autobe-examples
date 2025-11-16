import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller segment retrieval within a multi-seller order.
 *
 * This test validates the complete workflow where a buyer creates an order
 * containing items from multiple sellers, and then retrieves and filters the
 * seller-specific order segments. The test ensures that multi-seller orders are
 * properly split into independent seller fulfillment segments, each with
 * correct financial breakdowns and independent status tracking.
 *
 * Workflow:
 *
 * 1. Create buyer, admin, and two seller accounts
 * 2. Set up buyer's delivery address and payment method
 * 3. Create product category as admin
 * 4. Create product listings and SKUs for both sellers
 * 5. Add items from both sellers to buyer's cart
 * 6. Create order (automatically splits into seller segments)
 * 7. Retrieve and validate seller segments with various filters
 * 8. Test pagination, sorting, and search functionality
 */
export async function test_api_order_seller_segments_retrieval_for_multi_seller_order(
  connection: api.IConnection,
) {
  // 1. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "SecureBuyerPass123!";
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://marketplace.example.com/buyer/join",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 2. Create delivery address for buyer
  const deliveryAddress =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: buyer.full_name,
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: "Seoul",
          state: "Seoul",
          postal_code: "12345",
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(deliveryAddress);

  // 3. Create payment method for buyer
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "4242",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: buyer.full_name,
        billing_postal_code: "12345",
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 4. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://marketplace.example.com/admin/join",
      referrer: "https://marketplace.example.com/admin/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 5. Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 6. Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = "SellerPass123!";
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: "TechStore Inc",
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: "TechStore",
      href: "https://marketplace.example.com/seller/join",
      referrer: "https://marketplace.example.com/sell",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // 7. Create product sale for seller 1
  const sale1Code = RandomGenerator.alphaNumeric(10);
  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: sale1Code,
        shopping_mall_category_id: category.id,
        title: "Premium Laptop",
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale1);

  // 8. Create SKU for seller 1 product
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1Code,
      body: {
        sku_code: `${sale1Code}-SKU1`,
        variant_combination: JSON.stringify({ Color: "Silver", RAM: "16GB" }),
        base_price: 1299.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  // 9. Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = "SellerPass456!";
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: "GadgetWorld LLC",
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: "GadgetWorld",
      href: "https://marketplace.example.com/seller/join",
      referrer: "https://marketplace.example.com/sell",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // 10. Create product sale for seller 2
  const sale2Code = RandomGenerator.alphaNumeric(10);
  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: sale2Code,
        shopping_mall_category_id: category.id,
        title: "Wireless Headphones",
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 14,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale2);

  // 11. Create SKU for seller 2 product
  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2Code,
      body: {
        sku_code: `${sale2Code}-SKU1`,
        variant_combination: JSON.stringify({ Color: "Black" }),
        base_price: 199.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // 12. Switch back to buyer and add items to cart
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: "https://marketplace.example.com/buyer/login",
      referrer: "https://marketplace.example.com/products",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // 13. Add seller 1 product to cart
  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  // 14. Add seller 2 product to cart
  const cartItem2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku2.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // 15. Create multi-seller order from cart
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id],
        buyer_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
        notes: "Please deliver during business hours",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 16. Validate order contains seller segments
  TestValidator.predicate(
    "order contains seller segments",
    order.sellers.length === 2,
  );

  // 17. Retrieve all seller segments without filters
  const allSegments =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {} satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(allSegments);

  // 18. Validate pagination metadata
  TestValidator.equals(
    "total seller segments count",
    allSegments.pagination.records,
    2,
  );
  TestValidator.predicate(
    "segments data matches count",
    allSegments.data.length === 2,
  );

  // 19. Validate seller segments contain both sellers
  const seller1Segment = allSegments.data.find(
    (seg) => seg.seller.id === seller1.id,
  );
  const seller2Segment = allSegments.data.find(
    (seg) => seg.seller.id === seller2.id,
  );

  typia.assertGuard(seller1Segment!);
  typia.assertGuard(seller2Segment!);

  TestValidator.equals(
    "seller1 segment seller matches",
    seller1Segment.seller.id,
    seller1.id,
  );
  TestValidator.equals(
    "seller2 segment seller matches",
    seller2Segment.seller.id,
    seller2.id,
  );

  // 20. Validate financial breakdowns
  TestValidator.predicate(
    "seller1 segment has positive subtotal",
    seller1Segment.subtotal > 0,
  );
  TestValidator.predicate(
    "seller2 segment has positive subtotal",
    seller2Segment.subtotal > 0,
  );

  // 21. Test filtering by specific seller_id
  const seller1Filter =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        seller_id: seller1.id,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(seller1Filter);

  TestValidator.equals(
    "seller filter returns only one segment",
    seller1Filter.data.length,
    1,
  );
  TestValidator.equals(
    "filtered segment is seller1",
    seller1Filter.data[0].seller.id,
    seller1.id,
  );

  // 22. Test status filtering
  const statusFilter =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        status: "pending",
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(statusFilter);

  TestValidator.predicate(
    "all filtered segments have pending status",
    statusFilter.data.every((seg) => seg.status === "pending"),
  );

  // 23. Test pagination with limit
  const paginatedResult =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination shows correct total",
    paginatedResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination calculates pages correctly",
    paginatedResult.pagination.pages,
    2,
  );

  // 24. Test sorting by subtotal ascending
  const sortedBySubtotal =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "subtotal",
        sort_order: "asc",
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(sortedBySubtotal);

  if (sortedBySubtotal.data.length >= 2) {
    TestValidator.predicate(
      "segments sorted by subtotal ascending",
      sortedBySubtotal.data[0].subtotal <= sortedBySubtotal.data[1].subtotal,
    );
  }

  // 25. Test search functionality
  const searchResult =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        search: seller1Segment.seller.store_name,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "search finds matching seller",
    searchResult.data.some((seg) => seg.seller.id === seller1.id),
  );

  // 26. Test min_subtotal filter
  const minSubtotalValue = Math.min(
    seller1Segment.subtotal,
    seller2Segment.subtotal,
  );
  const minSubtotalFilter =
    await api.functional.shoppingMall.buyer.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        min_subtotal: minSubtotalValue,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(minSubtotalFilter);

  TestValidator.predicate(
    "all segments meet min_subtotal",
    minSubtotalFilter.data.every((seg) => seg.subtotal >= minSubtotalValue),
  );

  // 27. Validate sub_order_number uniqueness
  const subOrderNumbers = allSegments.data.map((seg) => seg.sub_order_number);
  const uniqueSubOrderNumbers = new Set(subOrderNumbers);
  TestValidator.equals(
    "all sub_order_numbers are unique",
    uniqueSubOrderNumbers.size,
    subOrderNumbers.length,
  );
}
