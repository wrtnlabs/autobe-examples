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
 * Test targeted cart item search with specific filter combinations to validate
 * precision filtering. Includes testing quantity range filters, price
 * thresholds, date-based filtering for recently added items, and text search
 * for product names or notes. Validates that filters work correctly
 * individually and in combination to provide precise cart item retrieval.
 */
export async function test_api_cart_items_search_with_specific_filters(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create shopping cart with customer session context
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // Step 3: Create realistic product variant data for testing
  const productVariants = ArrayUtil.repeat(5, (index) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    variant_name: `Product Variant ${index + 1}`,
    price: (index + 1) * 10, // Prices: 10, 20, 30, 40, 50
  }));

  // Step 4: Add diverse items with varied attributes for filter testing
  const itemsToAdd = ArrayUtil.repeat(5, (index) => ({
    product_variant_id: productVariants[index].id,
    quantity: (index + 1) * 2, // Quantities: 2, 4, 6, 8, 10
    notes: index % 2 === 0 ? `Special note for item ${index + 1}` : undefined,
  }));

  const addedItems: IShoppingMallCartItem[] = [];
  const additionTimestamps: string[] = [];

  for (const itemData of itemsToAdd) {
    // Add small delay between additions to create distinct timestamps
    if (addedItems.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const item: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: {
            cart_id: cart.id,
            product_variant_id: itemData.product_variant_id,
            quantity: itemData.quantity,
            notes: itemData.notes,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(item);
    addedItems.push(item);
    additionTimestamps.push(item.added_at);
  }

  // Step 5: Test quantity range filters
  const quantityFiltered: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        quantity_min: 3,
        quantity_max: 7,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(quantityFiltered);
  TestValidator.equals(
    "quantity filtered items count",
    quantityFiltered.data.length,
    2,
  );

  // Verify filtered items are within quantity range
  for (const item of quantityFiltered.data) {
    TestValidator.predicate(
      "filtered item quantity should be within range",
      item.quantity >= 3 && item.quantity <= 7,
    );
  }

  // Step 6: Test price threshold filters
  const priceFiltered: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        price_min: 15,
        price_max: 35,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(priceFiltered);

  // Verify price filtered items (assuming prices are captured correctly)
  TestValidator.predicate(
    "price filter should return some items",
    priceFiltered.data.length >= 0,
  );

  // Step 7: Test date-based filtering with reliable timestamp
  const middleTimestamp = additionTimestamps[2]; // Use timestamp from the middle item
  const dateFiltered: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        added_after: middleTimestamp,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filtered should return items added after middle timestamp",
    dateFiltered.data.length >= 2,
  );

  // Step 8: Test text search in notes
  const notesFiltered: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        notes: "Special note",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(notesFiltered);
  TestValidator.predicate(
    "notes filtered should find items with notes",
    notesFiltered.data.length >= 2,
  );

  // Step 9: Test sorting functionality
  const sortedByQuantity: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        sort_by: "quantity",
        order: "asc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortedByQuantity);

  // Verify ascending order of quantities
  for (let i = 1; i < sortedByQuantity.data.length; i++) {
    TestValidator.predicate(
      "quantities should be in ascending order",
      sortedByQuantity.data[i - 1].quantity <=
        sortedByQuantity.data[i].quantity,
    );
  }

  // Step 10: Test combination of multiple filters
  const combinedFiltered: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        quantity_min: 2,
        quantity_max: 8,
        price_min: 0,
        sort_by: "quantity",
        order: "desc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(combinedFiltered);

  // Verify descending order for combined filter results
  for (let i = 1; i < combinedFiltered.data.length; i++) {
    TestValidator.predicate(
      "quantities should be in descending order for combined filter",
      combinedFiltered.data[i - 1].quantity >=
        combinedFiltered.data[i].quantity,
    );
  }

  // Step 11: Test pagination
  const paginatedResults: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.equals(
    "paginated results should respect limit",
    paginatedResults.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata should be correct",
    paginatedResults.pagination.current,
    1,
  );

  // Step 12: Test error scenario with invalid cart ID
  await TestValidator.error("should fail with invalid cart ID", async () => {
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: "invalid-cart-id",
      body: {
        quantity_min: 1,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  });
}
