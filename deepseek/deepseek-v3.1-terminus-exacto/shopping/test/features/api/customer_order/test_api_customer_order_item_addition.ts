import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Comprehensive test for customer order item addition workflow that validates
 * the complete e-commerce scenario involving multiple actors (customer, seller,
 * admin) and proper authentication switching.
 *
 * This test establishes customer authentication, creates product catalog
 * infrastructure through admin and seller operations, creates an initial order,
 * and then adds items to the existing order while verifying pricing
 * consistency, inventory relationships, and seller attribution.
 */
export async function test_api_customer_order_item_addition(
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

  // Step 2: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_create_categories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category as admin
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
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create parent product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
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

  // Step 6: Create product variant as seller
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(8),
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<500>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
          attributes: JSON.stringify({ size: "large", color: "blue" }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // Step 7: Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/order",
      referrer: "https://example.com/products",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 8: Create initial order as customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 4 }),
        billing_address: RandomGenerator.paragraph({ sentences: 4 }),
        items: [
          {
            shopping_mall_product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 9: Add additional item to the existing order
  const additionalItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(additionalItem);

  // Step 10: Validate order item properties
  TestValidator.equals(
    "order item has correct product variant ID",
    additionalItem.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.predicate(
    "order item quantity is positive",
    additionalItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item unit price is positive",
    additionalItem.unit_price > 0,
  );
  TestValidator.predicate(
    "order item total price is positive",
    additionalItem.total_price > 0,
  );
  TestValidator.equals(
    "order item total price equals quantity times unit price",
    additionalItem.total_price,
    additionalItem.quantity * additionalItem.unit_price,
  );
  TestValidator.predicate(
    "order item has product name",
    additionalItem.product_name.length > 0,
  );
  TestValidator.equals(
    "order item belongs to correct order",
    additionalItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "order item has correct seller ID",
    additionalItem.shopping_mall_seller_id,
    seller.id,
  );

  // Step 11: Validate business logic consistency
  TestValidator.predicate(
    "order item unit price matches variant price",
    additionalItem.unit_price === variant.price,
  );
  TestValidator.predicate(
    "order item product name matches product name",
    additionalItem.product_name.includes(product.name),
  );

  console.log("✅ Order item addition test completed successfully");
}
