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
 * Test cart item notes update workflow where a customer adds or modifies
 * special instructions for a product in their shopping cart.
 *
 * This test validates that customer notes are properly stored and retrieved,
 * while maintaining the original quantity and pricing information unchanged.
 * The workflow includes customer authentication, cart creation, product setup
 * through seller operations, cart item addition, and notes modification
 * operation.
 */
export async function test_api_cart_item_update_notes_by_customer(
  connection: api.IConnection,
) {
  // 1. Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "support_admin",
        permissions: JSON.stringify({}),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Create product as seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
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
    });
  typia.assert(product);

  // 5. Create product variant
  const productVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
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

  // 6. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 7. Create shopping cart for customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 8. Add product variant to cart with initial notes
  const initialNotes = "Please gift wrap this item";
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        cart_id: cart.id,
        product_variant_id: productVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        notes: initialNotes,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 9. Update cart item notes
  const updatedNotes = "Gift wrap with blue ribbon and include gift message";
  const updatedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.putByCartidAndItemid(
      connection,
      {
        cartId: cart.id,
        itemId: cartItem.id,
        body: {
          notes: updatedNotes,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);

  // 10. Validate that notes were updated correctly
  TestValidator.equals(
    "notes should be updated",
    updatedCartItem.notes,
    updatedNotes,
  );

  // 11. Validate that quantity remains unchanged
  TestValidator.equals(
    "quantity should remain unchanged",
    updatedCartItem.quantity,
    cartItem.quantity,
  );

  // 12. Validate that unit price remains unchanged
  TestValidator.equals(
    "unit price should remain unchanged",
    updatedCartItem.unit_price,
    cartItem.unit_price,
  );

  // 13. Validate that cart ID remains unchanged
  TestValidator.equals(
    "cart ID should remain unchanged",
    updatedCartItem.shopping_mall_cart_id,
    cartItem.shopping_mall_cart_id,
  );

  // 14. Validate that product variant ID remains unchanged
  TestValidator.equals(
    "product variant ID should remain unchanged",
    updatedCartItem.shopping_mall_product_variant_id,
    cartItem.shopping_mall_product_variant_id,
  );
}
