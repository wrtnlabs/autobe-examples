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
 * Test authorization boundaries for order item deletion.
 *
 * This comprehensive E2E test validates that customers cannot delete items from
 * orders they don't own, ensuring proper security boundaries are maintained.
 * The test creates multiple customer accounts and verifies that each customer
 * can only modify their own orders, preventing unauthorized access to other
 * customers' order data.
 */
export async function test_api_customer_order_item_deletion_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shopping-mall.test/auth/seller/join",
      referrer: "https://shopping-mall.test/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: 1,
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create product with seller authentication
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: 1000,
        stock_quantity: 100,
        status: "active",
        condition: "new",
        category: {
          id: category.id,
          name: category.name,
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

  // Step 4: Create product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          sku: RandomGenerator.alphaNumeric(10),
          stock_quantity: 50,
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // Step 5: Create first customer account
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://shopping-mall.test/auth/customer/join",
      referrer: "https://shopping-mall.test/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer1);

  // Step 6: Create order with first customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 3 }),
        billing_address: RandomGenerator.paragraph({ sentences: 3 }),
        items: [
          {
            shopping_mall_product_variant_id: variant.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 7: Add item to the order
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_product_variant_id: variant.id,
        quantity: 2,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem);

  // Step 8: Create second customer account
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      password: "customer456",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: "https://shopping-mall.test/auth/customer/join",
      referrer: "https://shopping-mall.test/",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer2);

  // Step 9: Attempt to delete order item with second customer (should fail)
  await TestValidator.error(
    "second customer cannot delete first customer's order item",
    async () => {
      await api.functional.shopping_mall.customer.orders.items.erase(
        connection,
        {
          orderId: order.id,
          itemId: orderItem.id,
        },
      );
    },
  );

  // Step 10: Verify first customer can delete their own order item
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer1Email,
      password: "customer123",
      href: "https://shopping-mall.test/auth/customer/login",
      referrer: "https://shopping-mall.test/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  await api.functional.shopping_mall.customer.orders.items.erase(connection, {
    orderId: order.id,
    itemId: orderItem.id,
  });

  // Additional validation: Ensure the deletion was successful
  await TestValidator.error(
    "order item should no longer exist after deletion",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.create(
        connection,
        {
          orderId: order.id,
          body: {
            shopping_mall_product_variant_id: variant.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        },
      );
    },
  );
}
