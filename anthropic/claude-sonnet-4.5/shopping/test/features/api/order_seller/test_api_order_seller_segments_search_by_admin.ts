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
 * Test admin's ability to search and filter seller segments within a
 * multi-seller order.
 *
 * This comprehensive test validates the complete workflow from order creation
 * through seller segment querying with various filtering capabilities. It
 * creates necessary prerequisite data across multiple actors (admin, seller,
 * buyer), generates an order with seller segments, and then validates the
 * admin's search capabilities.
 *
 * Workflow:
 *
 * 1. Create and authenticate admin account with super_admin privileges
 * 2. Create product category for product organization
 * 3. Create seller account and authenticate
 * 4. Create product sale listing and SKU variant
 * 5. Create buyer account and authenticate
 * 6. Create delivery address and payment method
 * 7. Add product to cart and create order
 * 8. Switch to admin and search seller segments with various filters
 * 9. Validate pagination, filtering, and sorting functionality
 */
export async function test_api_order_seller_segments_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
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
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
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

  // 4. Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 5. Create SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Size: "Medium", Color: "Blue" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 6. Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // 7. Create delivery address for buyer
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 5 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "United States",
          address_label: "Home",
          address_type: "residential",
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // 8. Create payment method for buyer
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >() satisfies number as number,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // 9. Add product SKU to shopping cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 10. Create order from cart items
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

  // Validate order was created with seller segments
  TestValidator.predicate(
    "order should have seller segments",
    order.sellers.length > 0,
  );

  // 11. Switch to admin account for seller segment search
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 12. Search seller segments with basic pagination
  const basicSearch =
    await api.functional.shoppingMall.admin.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(basicSearch);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    basicSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    basicSearch.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination should have total records",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    basicSearch.pagination.pages >= 0,
  );

  // Validate data structure
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(basicSearch.data),
  );

  // 13. Filter by seller_id
  const sellerFilterSearch =
    await api.functional.shoppingMall.admin.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        seller_id: seller.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(sellerFilterSearch);

  // Validate all segments belong to the specified seller
  for (const segment of sellerFilterSearch.data) {
    TestValidator.equals(
      "segment should belong to filtered seller",
      segment.seller.id,
      seller.id,
    );
  }

  // 14. Filter by status
  const statusFilterSearch =
    await api.functional.shoppingMall.admin.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(statusFilterSearch);

  // 15. Test sorting by created_at ascending
  const sortAscSearch =
    await api.functional.shoppingMall.admin.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(sortAscSearch);

  // 16. Test sorting by subtotal descending
  const sortDescSearch =
    await api.functional.shoppingMall.admin.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        sort_by: "subtotal",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(sortDescSearch);

  // 17. Test combined filters (seller + status)
  const combinedFilterSearch =
    await api.functional.shoppingMall.admin.orders.sellers.index(connection, {
      orderId: order.id,
      body: {
        seller_id: seller.id,
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderSeller.IRequest,
    });
  typia.assert(combinedFilterSearch);
}
