import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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
 * Test the complete seller workflow for retrieving order items assigned to
 * their seller segment for fulfillment purposes.
 *
 * This test validates that sellers can access only the items they are
 * responsible for fulfilling within multi-seller orders. The scenario creates a
 * multi-seller marketplace environment with two sellers, each listing their own
 * products, and a buyer who purchases items from both sellers in a single
 * order. The test then validates that when the first seller retrieves order
 * items, they can only see items from their seller segment, not items belonging
 * to the second seller.
 *
 * Workflow steps:
 *
 * 1. Create admin account and product category
 * 2. Create two distinct seller accounts
 * 3. Each seller lists a product with SKU variants
 * 4. Create buyer account and authenticate
 * 5. Buyer adds products from both sellers to cart
 * 6. Buyer creates delivery address and payment method
 * 7. Buyer creates order with items from both sellers
 * 8. Switch to first seller authentication
 * 9. First seller retrieves their order items
 * 10. Validate seller can only see their own items
 * 11. Validate complete fulfillment information is present
 * 12. Test pagination and filtering capabilities
 */
export async function test_api_seller_order_items_retrieval_for_fulfillment(
  connection: api.IConnection,
) {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create first seller account
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = typia.random<string & tags.MinLength<8>>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller1);

  // 4. First seller creates a product
  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 20 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale1);

  // 5. First seller creates SKU for their product
  const basePrice1 = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: basePrice1,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  // 6. Create second seller account
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = typia.random<string & tags.MinLength<8>>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller2);

  // 7. Second seller creates a product
  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 20 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale2);

  // 8. Second seller creates SKU for their product
  const basePrice2 = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: basePrice2,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  // 9. Create buyer account
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

  // 10. Buyer adds first seller's product to cart
  const quantity1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          quantity: quantity1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

  // 11. Buyer adds second seller's product to cart
  const quantity2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const cartItem2 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku2.id,
          quantity: quantity2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);

  // 12. Buyer creates delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(1),
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 13. Buyer registers payment method
  const expiryMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >() satisfies number as number;
  const expiryYear = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<2024>
  >() satisfies number as number;
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(6),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 14. Buyer creates order with items from both sellers
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 15. Switch to first seller authentication - FIXED: Added await
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 16. First seller retrieves order items for the order
  const sellerOrderItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {} satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerOrderItems);

  // 17. Validate seller can only see their own items
  TestValidator.predicate(
    "seller should have at least one item in results",
    sellerOrderItems.data.length > 0,
  );

  const seller1Items = sellerOrderItems.data.filter(
    (item) => item.shopping_mall_sale_sku_id === sku1.id,
  );

  TestValidator.predicate(
    "seller should only see their own SKU items",
    seller1Items.length > 0,
  );

  const seller2Items = sellerOrderItems.data.filter(
    (item) => item.shopping_mall_sale_sku_id === sku2.id,
  );

  TestValidator.predicate(
    "seller should NOT see other seller's items",
    seller2Items.length === 0,
  );

  // 18. Validate first item exists and matches seller's SKU
  if (sellerOrderItems.data.length > 0) {
    const firstItem = sellerOrderItems.data[0];
    typia.assertGuard(firstItem!);

    TestValidator.equals(
      "first item should belong to seller 1",
      firstItem.shopping_mall_sale_sku_id,
      sku1.id,
    );
  }

  // 19. Test pagination with limit
  const paginatedItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(paginatedItems);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedItems.data.length <= 10,
  );

  // 20. Test sorting by created_at ascending
  const sortedAscItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedAscItems);

  // 21. Test sorting by unit_price descending
  const sortedDescItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "unit_price",
        order: "desc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedDescItems);

  // 22. Test filtering by product name search
  const searchItems =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {
        search: sale1.title.substring(0, 5),
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(searchItems);
}
