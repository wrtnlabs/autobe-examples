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
 * Test complete shopping cart item addition workflow including product variant
 * selection, inventory validation, and pricing preservation. Validates the
 * entire e-commerce workflow from account creation to cart item addition with
 * proper business logic validation and relationship integrity.
 */
export async function test_api_cart_item_addition_with_product_variants(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category via admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create parent product with seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
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
          parent: undefined,
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

  // Step 5: Create product variant with specific attributes
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<5000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<500>
          >(),
          attributes: JSON.stringify({
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            color: RandomGenerator.pick([
              "red",
              "blue",
              "green",
              "black",
            ] as const),
            material: "cotton",
          }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // Step 6: Create customer account for shopping
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://example.com/shop",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 7: Create shopping cart session
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
        shipping_method: undefined,
        applied_coupon_code: undefined,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 8: Add product variant to cart with specific quantity
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: variant.id,
        quantity: quantity,
        notes: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 9: Validate cart item properties including preserved pricing
  TestValidator.equals(
    "cart item cart ID matches",
    cartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "cart item product variant ID matches",
    cartItem.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals(
    "cart item quantity matches input",
    cartItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "cart item unit price matches variant price",
    cartItem.unit_price,
    variant.price ?? product.price,
  );
  TestValidator.predicate(
    "cart item added timestamp is valid",
    () => new Date(cartItem.added_at).getTime() > 0,
  );
  TestValidator.predicate(
    "cart item updated timestamp is valid",
    () => new Date(cartItem.updated_at).getTime() > 0,
  );

  // Step 10: Verify business logic - pricing preservation
  TestValidator.equals(
    "cart item preserves pricing at addition time",
    cartItem.unit_price,
    variant.price ?? product.price,
  );

  // Additional validation: Cart session relationship
  TestValidator.equals(
    "cart belongs to correct customer session",
    cart.shopping_mall_customer_session_id,
    customer.id,
  );
  TestValidator.predicate("cart has active status", cart.status === "active");
  TestValidator.predicate(
    "cart expiration is in the future",
    () => new Date(cart.expires_at).getTime() > Date.now(),
  );
}
