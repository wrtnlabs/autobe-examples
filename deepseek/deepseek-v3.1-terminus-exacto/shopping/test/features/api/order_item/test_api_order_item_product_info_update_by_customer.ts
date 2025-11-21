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
 * Test scenario where customer updates product information in an order item,
 * such as correcting product name or attributes after customer service
 * interaction. Validates that product information updates maintain historical
 * context while allowing corrections.
 */
export async function test_api_order_item_product_info_update_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ all: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: "TAX-123456789",
      href: "https://shoppingmall.example.com/seller/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Switch to admin to create category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 4: Admin creates category
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

  // Switch to seller to create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        compare_price: typia.random<
          number & tags.Minimum<1001> & tags.Maximum<2000>
        >(),
        cost_price: typia.random<
          number & tags.Minimum<1> & tags.Maximum<500>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        dimensions: "10x5x3",
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

  // Step 6: Seller creates product variant
  const productVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(12),
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
          attributes: JSON.stringify({
            size: "Large",
            color: "Blue",
            material: "Cotton",
          }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Switch back to customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shoppingmall.example.com/customer/dashboard",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 7: Customer creates order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 4 }),
        billing_address: RandomGenerator.paragraph({ sentences: 4 }),
        items: [
          {
            shopping_mall_product_variant_id: productVariant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 8: Customer adds item to order
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_product_variant_id: productVariant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem);

  // Step 9: Customer updates product information in the order item
  const updatedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.update(connection, {
      orderId: order.id,
      itemId: orderItem.id,
      body: {
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        unit_price: typia.random<
          number & tags.Minimum<1> & tags.Maximum<2000>
        >(),
        total_price: typia.random<
          number & tags.Minimum<1> & tags.Maximum<10000>
        >(),
        product_name: "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
        product_attributes: JSON.stringify({
          size: "Updated Size",
          color: "Updated Color",
          material: "Updated Material",
          correction: "Customer service correction applied",
        }),
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  typia.assert(updatedOrderItem);

  // Step 10: Validate that the update maintains historical context while allowing corrections
  TestValidator.equals(
    "order item ID remains the same",
    updatedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order ID reference remains the same",
    updatedOrderItem.shopping_mall_order_id,
    orderItem.shopping_mall_order_id,
  );
  TestValidator.equals(
    "product variant ID reference remains the same",
    updatedOrderItem.shopping_mall_product_variant_id,
    orderItem.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "seller ID reference remains the same",
    updatedOrderItem.shopping_mall_seller_id,
    orderItem.shopping_mall_seller_id,
  );
  TestValidator.notEquals(
    "quantity should be updated",
    updatedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.notEquals(
    "unit price should be updated",
    updatedOrderItem.unit_price,
    orderItem.unit_price,
  );
  TestValidator.notEquals(
    "total price should be updated",
    updatedOrderItem.total_price,
    orderItem.total_price,
  );
  TestValidator.notEquals(
    "product name should be updated",
    updatedOrderItem.product_name,
    orderItem.product_name,
  );
  TestValidator.notEquals(
    "product attributes should be updated",
    updatedOrderItem.product_attributes,
    orderItem.product_attributes,
  );

  // Validate that the update maintains proper relationships
  TestValidator.predicate(
    "updated quantity should be positive",
    updatedOrderItem.quantity > 0,
  );
  TestValidator.predicate(
    "updated unit price should be positive",
    updatedOrderItem.unit_price > 0,
  );
  TestValidator.predicate(
    "updated total price should be positive",
    updatedOrderItem.total_price > 0,
  );
  TestValidator.predicate(
    "product name should not be empty",
    updatedOrderItem.product_name.length > 0,
  );

  // Validate that the correction information is preserved
  const parsedAttributes = JSON.parse(updatedOrderItem.product_attributes!);
  TestValidator.equals(
    "correction field should be present",
    parsedAttributes.correction,
    "Customer service correction applied",
  );
}
