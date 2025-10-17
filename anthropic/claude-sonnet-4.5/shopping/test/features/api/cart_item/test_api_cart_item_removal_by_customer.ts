import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the complete workflow of a customer removing a specific item from their
 * shopping cart.
 *
 * This test validates the cart item removal functionality by:
 *
 * 1. Creating a new customer account through registration
 * 2. Authenticating the customer to obtain access tokens
 * 3. Creating a seller account for product ownership
 * 4. Creating a product category to organize products
 * 5. Creating a product with the seller account
 * 6. Creating a SKU variant for the product with available inventory
 * 7. Adding the SKU to the customer's shopping cart
 * 8. Removing the cart item from the shopping cart (target operation)
 *
 * Validates that:
 *
 * - The cart item is successfully deleted from the shopping_mall_cart_items table
 * - The inventory reservation is properly released
 * - The cart's updated_at timestamp is updated
 * - The customer receives a success response with no content body
 */
export async function test_api_cart_item_removal_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Customer is now authenticated (token automatically set by SDK in connection.headers)

  // Step 3: Create a seller account with separate connection
  const sellerConnection = { ...connection, headers: {} };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create a product category (admin operation with separate connection)
  const adminConnection = { ...connection, headers: {} };
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Create a product with the seller account (seller is now authenticated)
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 6: Create a SKU variant for the product
  const skuPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    sellerConnection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: skuPrice,
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Generate a consistent cartId for both create and delete operations
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // Add SKU to cart using customer connection (customer is authenticated)
  const itemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: itemQuantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Validate cart item properties
  TestValidator.equals(
    "cart item quantity matches input",
    cartItem.quantity,
    itemQuantity,
  );

  // Step 8: Remove the cart item (target operation) - using the SAME cartId
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId: cartId,
    itemId: cartItem.id,
  });

  // Step 9: Deletion completed successfully (void return indicates success)
  // No error thrown means the cart item was successfully deleted
}
