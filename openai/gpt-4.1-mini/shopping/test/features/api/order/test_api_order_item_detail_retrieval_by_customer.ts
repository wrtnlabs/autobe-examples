import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validates retrieval of a specific order item's detailed information by a
 * customer.
 *
 * Workflow:
 *
 * 1. Customer signs up and authenticates
 * 2. Seller signs up and authenticates
 * 3. Admin creates a product category
 * 4. Admin creates a seller
 * 5. Admin creates a product in the category by the seller
 * 6. Seller creates an SKU for the product
 * 7. Customer creates an order for the seller
 * 8. Customer adds an order item to the order, referencing SKU with quantity and
 *    pricing
 * 9. Customer retrieves the detailed information of the order item
 *
 * Each step involves role-appropriate authentication and proper data
 * assertions. The test confirms the properties of the order item match the
 * created SKU, quantity, and pricing.
 *
 * This test ensures correctness of order item detail access and data integrity
 * in a multi-role ecommerce platform.
 */
export async function test_api_order_item_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "securePassword123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Seller signs up and authenticates
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "securePassword123!",
      __typename: "string",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: "hashedPassword123!",
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 3. Admin creates a product category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "hashedPassword123!",
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Admin creates a seller
  const createdSeller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    {
      body: {
        email: sellerEmail,
        password_hash: "hashedPassword123!",
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    },
  );
  typia.assert(createdSeller);

  // 5. Admin creates a product in the category by the seller
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code: `cat-${RandomGenerator.alphaNumeric(6)}`,
          name: "Electronics",
          display_order: 1,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: createdSeller.id,
        code: `prod-${RandomGenerator.alphaNumeric(6)}`,
        name: "Smartphone",
        status: "active",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller creates an SKU for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        price: 999.99,
        status: "active",
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // 7. Customer creates an order for the seller
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: createdSeller.id,
        order_number: `ORD-${RandomGenerator.alphaNumeric(10)}`,
        total_price: 999.99,
        status: "pending",
        business_status: "pending",
        payment_method: "credit_card",
        shipping_address: "123 Main St, City, Country",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 8. Customer adds an order item to the order, referencing SKU with quantity and pricing
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
        total_price: sku.price * 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem);

  // 9. Customer retrieves the detailed information of the order item
  const orderItemDetail =
    await api.functional.shoppingMall.customer.orders.items.at(connection, {
      orderId: order.id,
      orderItemId: orderItem.id,
    });
  typia.assert(orderItemDetail);

  // Business validation
  TestValidator.equals(
    "order item's quantity matches SKU quantity",
    orderItemDetail.quantity,
    1,
  );
  TestValidator.equals(
    "order item's unit price matches SKU price",
    orderItemDetail.unit_price,
    sku.price,
  );
  TestValidator.equals(
    "order item's total price matches quantity * unit price",
    orderItemDetail.total_price,
    sku.price * 1,
  );
}
