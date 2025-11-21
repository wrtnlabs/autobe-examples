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
 * Test cart item retrieval workflow where a customer views detailed information
 * about a specific product in their shopping cart. The scenario validates that
 * cart item details including product variant information, quantity, unit
 * price, notes, and timestamps are correctly retrieved. The workflow includes
 * customer authentication, cart creation, product setup through seller
 * operations, cart item addition, and retrieval operation to verify complete
 * cart item information display.
 */
export async function test_api_cart_item_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      contact_person: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create admin account and authenticate for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
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

  // Step 6: Create product variant
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.name(3),
          sku: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<5000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({ size: "M", color: "blue" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Step 7: Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 8: Create shopping cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 9: Add product variant to cart
  const cartItemNotes = RandomGenerator.paragraph({ sentences: 2 });
  const cartItemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();

  const addedCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: cartItemQuantity,
        notes: cartItemNotes,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(addedCartItem);

  // Step 10: Retrieve cart item details
  const retrievedCartItem =
    await api.functional.shoppingMall.customer.carts.items.getByCartidAndProductvariantid(
      connection,
      {
        cartId: cart.id,
        productVariantId: productVariant.id,
      },
    );
  typia.assert(retrievedCartItem);

  // Step 11: Validate cart item properties
  TestValidator.equals(
    "cart item ID matches",
    retrievedCartItem.id,
    addedCartItem.id,
  );
  TestValidator.equals(
    "cart ID matches",
    retrievedCartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "product variant ID matches",
    retrievedCartItem.shopping_mall_product_variant_id,
    productVariant.id,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedCartItem.quantity,
    cartItemQuantity,
  );

  // Handle product variant price (may be null and inherit from product)
  const expectedUnitPrice = productVariant.price ?? product.price;
  TestValidator.equals(
    "unit price matches",
    retrievedCartItem.unit_price,
    expectedUnitPrice,
  );

  TestValidator.equals("notes match", retrievedCartItem.notes, cartItemNotes);

  // Validate timestamps using proper format validation
  TestValidator.predicate(
    "added_at is valid date-time format",
    retrievedCartItem.added_at.includes("T") &&
      retrievedCartItem.added_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    retrievedCartItem.updated_at.includes("T") &&
      retrievedCartItem.updated_at.endsWith("Z"),
  );

  // Validate cart item structure - typia.assert already validates UUID format
  TestValidator.predicate(
    "quantity is within valid range",
    retrievedCartItem.quantity >= 1 && retrievedCartItem.quantity <= 999,
  );
  TestValidator.predicate(
    "unit price is positive",
    retrievedCartItem.unit_price > 0,
  );
}
