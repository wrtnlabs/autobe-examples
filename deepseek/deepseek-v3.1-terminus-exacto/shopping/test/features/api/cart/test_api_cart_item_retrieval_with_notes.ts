import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test cart item retrieval workflow specifically validating that customer notes
 * and special instructions are properly preserved and displayed when retrieving
 * cart item details.
 */
export async function test_api_cart_item_retrieval_with_notes(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller-register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({ canManageCategories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Switch to seller account for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com/seller-dashboard",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: category.parent,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 7: Create product variant
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(8),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<5000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({ size: "large", color: "blue" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Step 8: Switch back to customer account
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://example.com/shopping",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 9: Create shopping cart with proper session ID
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 10: Add cart item with customer notes
  const customerNotes =
    "Please gift wrap this item and include a birthday message";
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        notes: customerNotes,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 11: Retrieve cart item and validate notes preservation
  const retrievedCartItem =
    await api.functional.shoppingMall.customer.carts.items.getByCartidAndProductvariantid(
      connection,
      {
        cartId: cart.id,
        productVariantId: productVariant.id,
      },
    );
  typia.assert(retrievedCartItem);

  // Step 12: Validate that notes are properly preserved
  TestValidator.equals(
    "cart item notes should be preserved",
    retrievedCartItem.notes,
    customerNotes,
  );
  TestValidator.equals(
    "cart item ID should match",
    retrievedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart ID should match",
    retrievedCartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "product variant ID should match",
    retrievedCartItem.shopping_mall_product_variant_id,
    productVariant.id,
  );
  TestValidator.equals(
    "quantity should match",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "unit price should match",
    retrievedCartItem.unit_price,
    cartItem.unit_price,
  );

  // Step 13: Validate timestamps
  TestValidator.predicate(
    "added_at timestamp should be valid",
    retrievedCartItem.added_at !== null &&
      retrievedCartItem.added_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    retrievedCartItem.updated_at !== null &&
      retrievedCartItem.updated_at !== undefined,
  );

  // Step 14: Test edge case - cart item without notes
  const cartItemWithoutNotes =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItemWithoutNotes);

  const retrievedCartItemWithoutNotes =
    await api.functional.shoppingMall.customer.carts.items.getByCartidAndProductvariantid(
      connection,
      {
        cartId: cart.id,
        productVariantId: productVariant.id,
      },
    );
  typia.assert(retrievedCartItemWithoutNotes);

  TestValidator.equals(
    "cart item without notes should have undefined notes",
    retrievedCartItemWithoutNotes.notes,
    undefined,
  );

  console.log("✅ Cart item retrieval with notes test completed successfully");
}
