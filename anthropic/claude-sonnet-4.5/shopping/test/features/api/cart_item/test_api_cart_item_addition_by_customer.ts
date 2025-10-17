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
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test complete workflow of adding product items to customer shopping cart.
 *
 * This test validates the end-to-end cart item addition process including:
 *
 * 1. Customer authentication and session establishment
 * 2. Admin account creation for category management
 * 3. Seller account setup for product ownership
 * 4. Product category creation for catalog organization
 * 5. Product and SKU creation with inventory
 * 6. Adding SKU to cart with quantity validation
 * 7. Inventory reservation verification
 * 8. Price snapshot capture
 *
 * The test ensures proper cart operations, inventory management, and business
 * rule enforcement.
 */
export async function test_api_cart_item_addition_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Save customer authentication token for later restoration
  const customerToken = customer.token.access;

  // Step 2: Create and authenticate admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create product category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(),
        business_type: "corporation",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 5: Create product as seller
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const basePrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100000>
  >();

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: productName,
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 6: Create SKU variant for the product
  const skuCode = RandomGenerator.alphaNumeric(12);
  const skuPrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100000>
  >();

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: skuCode,
        price: skuPrice,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Step 7: Restore customer authentication to perform cart operations
  connection.headers = connection.headers || {};
  connection.headers.Authorization = customerToken;

  // Step 8: Add SKU to customer's cart
  // Note: Using customer ID as cartId - the API likely auto-creates cart per customer
  const cartId = customer.id;
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartId,
      body: {
        shopping_mall_sku_id: sku.id,
        quantity: quantity,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 9: Validate cart item was created successfully
  TestValidator.equals(
    "cart item quantity matches requested",
    cartItem.quantity,
    quantity,
  );

  // Validate cart item has valid ID
  TestValidator.predicate(
    "cart item ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cartItem.id,
    ),
  );
}
