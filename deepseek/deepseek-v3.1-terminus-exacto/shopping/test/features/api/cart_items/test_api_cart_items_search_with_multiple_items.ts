import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";

/**
 * Comprehensive test for cart item search functionality with multiple products
 * added to the cart.
 *
 * This test validates advanced filtering capabilities including quantity
 * ranges, price thresholds, date-based filters, and text search. Tests
 * pagination behavior, sorting options, and complex query combinations to
 * ensure robust search functionality for cart management.
 *
 * The test follows a realistic e-commerce workflow:
 *
 * 1. Customer authentication and cart creation
 * 2. Adding multiple items with different quantities and prices
 * 3. Testing search with various filter combinations
 * 4. Validating pagination and sorting functionality
 * 5. Testing complex query scenarios with multiple filters
 */
export async function test_api_cart_items_search_with_multiple_items(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create shopping cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: "standard",
        applied_coupon_code: undefined,
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 3. Add multiple items to cart with different quantities and prices
  const cartItems: IShoppingMallCartItem[] = [];

  // Add 5 different items with varying quantities and prices
  for (let i = 0; i < 5; i++) {
    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: {
            cart_id: cart.id,
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
            notes:
              i % 2 === 0
                ? RandomGenerator.paragraph({ sentences: 2 })
                : undefined,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }

  // 4. Test basic search without filters (should return all items)
  const allItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(allItems);
  TestValidator.equals(
    "all items should be returned",
    allItems.data.length,
    cartItems.length,
  );

  // 5. Test pagination
  const paginatedItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(paginatedItems);
  TestValidator.equals(
    "pagination limit should be respected",
    paginatedItems.data.length,
    2,
  );
  TestValidator.equals(
    "total records should match",
    paginatedItems.pagination.records,
    cartItems.length,
  );

  // 6. Test quantity filtering
  const minQuantity = 3;
  const quantityFilteredItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        quantity_min: minQuantity,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(quantityFilteredItems);

  // Verify all returned items meet the quantity minimum
  for (const item of quantityFilteredItems.data) {
    TestValidator.predicate(
      "item quantity should meet minimum requirement",
      item.quantity >= minQuantity,
    );
  }

  // 7. Test price filtering
  const maxPrice = 50;
  const priceFilteredItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        price_max: maxPrice,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(priceFilteredItems);

  // Verify all returned items meet the price maximum
  for (const item of priceFilteredItems.data) {
    TestValidator.predicate(
      "item price should meet maximum requirement",
      item.unit_price <= maxPrice,
    );
  }

  // 8. Test sorting by unit price (descending)
  const sortedByPriceDesc: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        sort_by: "unit_price",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByPriceDesc);

  // Verify descending order
  if (sortedByPriceDesc.data.length > 1) {
    for (let i = 1; i < sortedByPriceDesc.data.length; i++) {
      TestValidator.predicate(
        "items should be sorted by price descending",
        sortedByPriceDesc.data[i - 1].unit_price >=
          sortedByPriceDesc.data[i].unit_price,
      );
    }
  }

  // 9. Test sorting by quantity (ascending)
  const sortedByQuantityAsc: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        sort_by: "quantity",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByQuantityAsc);

  // Verify ascending order
  if (sortedByQuantityAsc.data.length > 1) {
    for (let i = 1; i < sortedByQuantityAsc.data.length; i++) {
      TestValidator.predicate(
        "items should be sorted by quantity ascending",
        sortedByQuantityAsc.data[i - 1].quantity <=
          sortedByQuantityAsc.data[i].quantity,
      );
    }
  }

  // 10. Test complex filter combination
  const complexFilteredItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        quantity_min: 2,
        quantity_max: 8,
        price_min: 10,
        price_max: 100,
        sort_by: "added_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(complexFilteredItems);

  // Verify complex filter conditions
  for (const item of complexFilteredItems.data) {
    TestValidator.predicate(
      "item quantity should be between min and max",
      item.quantity >= 2 && item.quantity <= 8,
    );
    TestValidator.predicate(
      "item price should be between min and max",
      item.unit_price >= 10 && item.unit_price <= 100,
    );
  }

  // 11. Test date-based filtering (items added after a certain time)
  const recentItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        added_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(recentItems);

  // 12. Test notes filtering (if any items have notes)
  const itemsWithNotes = cartItems.filter((item) => item.notes);
  if (itemsWithNotes.length > 0) {
    const notesFilteredItems: IPageIShoppingMallCartItem.ISummary =
      await api.functional.shoppingMall.customer.carts.items.index(connection, {
        cartId: cart.id,
        body: {
          notes: "test", // Search for items with notes containing "test"
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCartItem.IRequest,
      });
    typia.assert(notesFilteredItems);
  }

  // 13. Test search functionality with text search
  const searchItems: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        search: "product", // Generic search term
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(searchItems);

  // 14. Validate pagination metadata
  TestValidator.predicate(
    "current page should be valid",
    allItems.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be valid",
    allItems.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be valid",
    allItems.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be valid",
    allItems.pagination.pages >= 0,
  );

  // 15. Test edge case: empty filter results
  const noResultsFilter: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        quantity_min: 1000, // Impossible quantity
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(noResultsFilter);
  TestValidator.equals(
    "no items should match impossible filter",
    noResultsFilter.data.length,
    0,
  );
}
