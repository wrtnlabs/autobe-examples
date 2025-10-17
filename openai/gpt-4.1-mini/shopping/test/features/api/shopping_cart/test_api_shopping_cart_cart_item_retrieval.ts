import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the retrieval of a specific shopping cart item by its ID.
 *
 * This test verifies that a customer can retrieve their own cart items,
 * ensuring data integrity and authorization controls.
 *
 * Workflow:
 *
 * 1. Customer registration and authentication.
 * 2. Shopping cart creation for that customer.
 * 3. Admin creates a product category.
 * 4. Seller registration and authentication.
 * 5. Seller creates a product associated with the category.
 * 6. Seller creates a SKU variant for the product.
 * 7. Customer adds a cart item referencing the SKU.
 * 8. Customer retrieves the cart item by its ID.
 * 9. Validates the retrieved cart item matches the created one.
 */
export async function test_api_shopping_cart_cart_item_retrieval(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "P@ssw0rd1234",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Shopping cart creation linked to the customer
  const cart = await api.functional.shoppingMall.customer.shoppingCarts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        session_id: null,
      } satisfies IShoppingMallShoppingCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. Admin registration and creation of category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "securehash",
      full_name: "Admin User",
      phone_number: RandomGenerator.mobile(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          parent_id: null,
          code: `CAT-${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
          name: "Electronics",
          description: "Electronics products",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: "securehash",
      company_name: "BestSeller Inc.",
      contact_name: "John Seller",
      phone_number: RandomGenerator.mobile(),
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 5. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: `PRD-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
        name: "Smartphone",
        description: "Latest smartphone model",
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller creates a SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: `SKU-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >() satisfies number as number,
        weight: 200,
        status: "active",
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // 7. Customer adds the SKU as a cart item
  const cartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.create(
      connection,
      {
        shoppingCartId: cart.id,
        body: {
          shopping_mall_shopping_cart_id: cart.id,
          shopping_mall_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 8. Retrieve the specific cart item by its ID
  const retrievedItem =
    await api.functional.shoppingMall.customer.shoppingCarts.cartItems.at(
      connection,
      {
        shoppingCartId: cart.id,
        cartItemId: cartItem.id,
      },
    );
  typia.assert(retrievedItem);

  // 9. Verify that retrieved data matches what was added
  TestValidator.equals("cart item ID matches", retrievedItem.id, cartItem.id);
  TestValidator.equals(
    "cart item shopping cart ID matches",
    retrievedItem.shopping_mall_shopping_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "cart item SKU ID matches",
    retrievedItem.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "cart item quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
}
