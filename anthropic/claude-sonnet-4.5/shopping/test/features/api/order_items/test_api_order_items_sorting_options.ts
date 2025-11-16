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
 * Test comprehensive sorting capabilities for order items across multiple sort
 * fields and directions.
 *
 * This test validates that buyers can sort their order items by various fields
 * (created_at, unit_price, quantity, line_total) in both ascending and
 * descending order. The test creates an order with multiple items having
 * different prices, quantities, and line totals, then retrieves the items using
 * each available sort option to verify correct ordering.
 *
 * Test workflow:
 *
 * 1. Create buyer account for order placement
 * 2. Create admin account for category management
 * 3. Create product category
 * 4. Create seller account for product sales
 * 5. Create multiple product sales with different SKUs having varied prices
 * 6. Add items to cart with different quantities
 * 7. Create delivery address and payment method
 * 8. Place order with diverse items
 * 9. Test sorting by created_at (asc/desc)
 * 10. Test sorting by unit_price (asc/desc)
 * 11. Test sorting by quantity (asc/desc)
 * 12. Test sorting by line_total (asc/desc)
 * 13. Verify pagination maintains sort order
 */
export async function test_api_order_items_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
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

  // 2. Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 5. Create multiple sales with different SKUs and prices
  const sale1 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale1);

  const sale2 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale2);

  const sale3 = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 7,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale3);

  // Create SKUs with different prices
  const sku1 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale1.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Size: "Small" }),
        base_price: 50,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku1);

  const sku2 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale2.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Size: "Medium" }),
        base_price: 100,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku2);

  const sku3 = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale3.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Size: "Large" }),
        base_price: 150,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku3);

  // 6. Switch to buyer and add items to cart with different quantities
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const cartItem1 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);

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

  const cartItem3 =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku3.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem3);

  // 7. Create delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "South Korea",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 8. Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: "1234",
        expiry_month: 12,
        expiry_year: 2025,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 9. Place order
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem1.id, cartItem2.id, cartItem3.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: "Test order for sorting validation",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 10. Test sorting by created_at ascending
  const sortByCreatedAsc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByCreatedAsc);
  TestValidator.predicate(
    "created_at asc returns items",
    sortByCreatedAsc.data.length >= 3,
  );

  // 11. Test sorting by created_at descending
  const sortByCreatedDesc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByCreatedDesc);
  TestValidator.predicate(
    "created_at desc returns items",
    sortByCreatedDesc.data.length >= 3,
  );

  // 12. Test sorting by unit_price ascending
  const sortByPriceAsc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "unit_price",
        order: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByPriceAsc);
  TestValidator.predicate(
    "unit_price asc orders by price low to high",
    sortByPriceAsc.data.length >= 3 &&
      sortByPriceAsc.data[0].unit_price <= sortByPriceAsc.data[1].unit_price,
  );

  // 13. Test sorting by unit_price descending
  const sortByPriceDesc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "unit_price",
        order: "desc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByPriceDesc);
  TestValidator.predicate(
    "unit_price desc orders by price high to low",
    sortByPriceDesc.data.length >= 3 &&
      sortByPriceDesc.data[0].unit_price >= sortByPriceDesc.data[1].unit_price,
  );

  // 14. Test sorting by quantity ascending
  const sortByQuantityAsc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "quantity",
        order: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByQuantityAsc);
  TestValidator.predicate(
    "quantity asc orders by quantity low to high",
    sortByQuantityAsc.data.length >= 3 &&
      sortByQuantityAsc.data[0].quantity <= sortByQuantityAsc.data[1].quantity,
  );

  // 15. Test sorting by quantity descending
  const sortByQuantityDesc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "quantity",
        order: "desc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByQuantityDesc);
  TestValidator.predicate(
    "quantity desc orders by quantity high to low",
    sortByQuantityDesc.data.length >= 3 &&
      sortByQuantityDesc.data[0].quantity >=
        sortByQuantityDesc.data[1].quantity,
  );

  // 16. Test sorting by line_total ascending
  const sortByLineTotalAsc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "line_total",
        order: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByLineTotalAsc);
  TestValidator.predicate(
    "line_total asc orders by total low to high",
    sortByLineTotalAsc.data.length >= 3 &&
      sortByLineTotalAsc.data[0].line_total <=
        sortByLineTotalAsc.data[1].line_total,
  );

  // 17. Test sorting by line_total descending
  const sortByLineTotalDesc =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "line_total",
        order: "desc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortByLineTotalDesc);
  TestValidator.predicate(
    "line_total desc orders by total high to low",
    sortByLineTotalDesc.data.length >= 3 &&
      sortByLineTotalDesc.data[0].line_total >=
        sortByLineTotalDesc.data[1].line_total,
  );

  // 18. Test pagination with sorting
  const paginatedSort =
    await api.functional.shoppingMall.buyer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 2,
        sort_by: "unit_price",
        order: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(paginatedSort);
  TestValidator.predicate(
    "pagination maintains sort order",
    paginatedSort.pagination.limit === 2 && paginatedSort.data.length <= 2,
  );
}
