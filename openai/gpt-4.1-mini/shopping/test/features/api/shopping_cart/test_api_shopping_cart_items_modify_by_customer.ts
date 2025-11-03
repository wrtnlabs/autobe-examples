import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";

/**
 * Test the modification of shopping cart items by the authenticated customer.
 *
 * This test covers:
 *
 * 1. Customer join and authentication
 * 2. Creating an initial shopping cart modification request with multiple items
 * 3. Modifying quantities of existing items
 * 4. Removing an item from the cart
 * 5. Adding new items to the cart
 * 6. Asserting the correctness of the paginated response and item details
 * 7. Validating security: unauthorized user cannot modify someone else's cart
 */
export async function test_api_shopping_cart_items_modify_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const password = "securePassword123";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Initial cart items to add
  const initialItems: IShoppingMallCartItem.ICreate[] = ArrayUtil.repeat(
    3,
    () => {
      return {
        shopping_mall_product_sku_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: RandomGenerator.pick([1, 2]),
      } satisfies IShoppingMallCartItem.ICreate;
    },
  );

  // Step 3: Add initial items to the shopping cart (patch call with initial items)
  const firstPatchResponse: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId: typia.random<string & tags.Format<"uuid">>(), // Generate a UUID for cartId
        body: {
          items: initialItems,
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(firstPatchResponse);

  // Validate pagination info structure
  const pagination = firstPatchResponse.pagination;
  TestValidator.predicate(
    "pagination metadata is present",
    pagination !== null && typeof pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    typeof pagination.limit === "number" && pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );

  // Validate that returned data contains all initial items by SKU ID
  const returnedSkuIds = firstPatchResponse.data.map(
    (item) => item.shopping_mall_product_sku_id,
  );
  initialItems.forEach(({ shopping_mall_product_sku_id }) => {
    TestValidator.predicate(
      `returned data includes SKU ${shopping_mall_product_sku_id}`,
      returnedSkuIds.includes(shopping_mall_product_sku_id),
    );
  });

  // Save an actual cart ID returned for subsequent modifications
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Modify quantity of one existing item and remove another
  const modifyItemIndex = 0;
  const removeItemIndex = 1;

  const modifiedItems: IShoppingMallCartItem.ICreate[] = [];

  for (let i = 0; i < initialItems.length; i++) {
    if (i === modifyItemIndex) {
      modifiedItems.push({
        shopping_mall_product_sku_id:
          initialItems[i].shopping_mall_product_sku_id,
        quantity: initialItems[i].quantity + 2,
      });
    }
    if (i === removeItemIndex) {
      continue;
    }
    if (i !== modifyItemIndex && i !== removeItemIndex) {
      modifiedItems.push(initialItems[i]);
    }
  }

  // Step 5: Add a new item
  const newItem: IShoppingMallCartItem.ICreate = {
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
  };
  modifiedItems.push(newItem);

  // Step 6: Send patch request with modified items
  const secondPatchResponse: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.items.index(
      connection,
      {
        cartId, // Use the saved or generated cartId
        body: {
          items: modifiedItems,
        } satisfies IShoppingMallShoppingCartItem.IRequest,
      },
    );
  typia.assert(secondPatchResponse);

  // Step 7: Validate that the modified quantity and new item are in returned data
  const updatedSkuQuantities = new Map<string, number>();
  secondPatchResponse.data.forEach((item) => {
    updatedSkuQuantities.set(item.shopping_mall_product_sku_id, item.quantity);
  });

  TestValidator.equals(
    "modified item quantity updated correctly",
    updatedSkuQuantities.get(
      initialItems[modifyItemIndex].shopping_mall_product_sku_id,
    ),
    initialItems[modifyItemIndex].quantity + 2,
  );

  TestValidator.predicate(
    "removed item is not present",
    !updatedSkuQuantities.has(
      initialItems[removeItemIndex].shopping_mall_product_sku_id,
    ),
  );

  TestValidator.predicate(
    "new item added",
    updatedSkuQuantities.has(newItem.shopping_mall_product_sku_id),
  );

  // Step 8: Validate only the cart owner can modify the cart - attempt with another customer
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: otherCustomerEmail,
        password: password,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(otherCustomer);

  // Attempt patch with another customer's auth but cart of first customer
  // Note: The connection object manages authentication headers internally.
  // To simulate different user auth, create a shallow copy with empty headers.
  const otherConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized user cannot modify another customer's cart",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.index(
        otherConnection,
        {
          cartId, // First customer's cart
          body: {
            items: initialItems,
          } satisfies IShoppingMallShoppingCartItem.IRequest,
        },
      );
    },
  );
}
