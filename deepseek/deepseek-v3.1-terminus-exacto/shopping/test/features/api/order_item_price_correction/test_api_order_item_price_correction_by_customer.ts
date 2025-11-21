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
 * Validates customer-initiated price correction for order items.
 *
 * This test simulates a real-world scenario where a customer discovers a
 * pricing error or promotional discount after placing an order and requests a
 * price correction. The test validates that the price correction API properly
 * updates the unit price and recalculates the total price while maintaining
 * historical accuracy of the original purchase.
 *
 * The test follows a comprehensive multi-actor workflow:
 *
 * 1. Administrator creates product category for classification
 * 2. Seller registers product and creates product variant
 * 3. Customer creates order and adds product variant as order item
 * 4. Customer requests price correction with updated pricing
 * 5. System validates price correction and recalculates totals
 *
 * Key validations include:
 *
 * - Price correction API successfully processes the request
 * - Unit price is updated to the corrected value
 * - Total price is recalculated based on quantity and new unit price
 * - Original order item data remains accessible for audit purposes
 * - Business rules for price corrections are properly enforced
 */
export async function test_api_order_item_price_correction_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin123!",
        first_name: "Admin",
        last_name: "User",
        role: "super_admin",
        permissions: JSON.stringify({ all: true }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Seller123!",
        business_name: "Tech Store Inc.",
        contact_person: "John Seller",
        phone_number: "+1-555-0123",
        business_address: "123 Tech Street, Tech City",
        href: "https://example.com/seller-registration",
        referrer: "https://example.com/",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product with proper summary types
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: "Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        sku: "WH-2024-001",
        price: 199.99,
        compare_price: 249.99,
        cost_price: 120.0,
        stock_quantity: 50,
        status: "active",
        condition: "new",
        weight: 0.3,
        dimensions: "20x15x8cm",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ??
            ("00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid"> as string & tags.Format<"uuid">),
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

  // Step 5: Create product variant
  const productVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          variant_name: "Wireless Headphones - Black",
          sku: "WH-2024-001-BLK",
          price: 199.99,
          stock_quantity: 25,
          attributes: JSON.stringify({
            color: "black",
            connectivity: "wireless",
          }),
          active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(productVariant);

  // Step 6: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Customer123!",
        first_name: "John",
        last_name: "Customer",
        phone_number: "+1-555-0456",
        href: "https://example.com/customer-registration",
        referrer: "https://example.com/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 7: Create order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        currency: "USD",
        shipping_address: "123 Customer Street, Customer City",
        billing_address: "123 Customer Street, Customer City",
        items: [], // Empty initially, will add items separately
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 8: Add order item with original price
  const originalOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_product_variant_id: productVariant.id,
        quantity: 2,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(originalOrderItem);

  // Validate original pricing
  TestValidator.equals(
    "original unit price matches product variant price",
    originalOrderItem.unit_price,
    199.99,
  );
  TestValidator.equals(
    "original total price calculates correctly",
    originalOrderItem.total_price,
    199.99 * 2, // quantity * unit_price
  );

  // Step 9: Customer requests price correction (promotional discount)
  const correctedUnitPrice = 179.99; // $20 discount per unit
  const correctedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.orders.items.update(connection, {
      orderId: order.id,
      itemId: originalOrderItem.id,
      body: {
        unit_price: correctedUnitPrice,
        total_price: correctedUnitPrice * 2, // quantity remains 2
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  typia.assert(correctedOrderItem);

  // Step 10: Validate price correction results
  TestValidator.equals(
    "corrected unit price matches requested correction",
    correctedOrderItem.unit_price,
    correctedUnitPrice,
  );
  TestValidator.equals(
    "corrected total price recalculates correctly",
    correctedOrderItem.total_price,
    correctedUnitPrice * 2,
  );
  TestValidator.notEquals(
    "unit price changed after correction",
    correctedOrderItem.unit_price,
    originalOrderItem.unit_price,
  );
  TestValidator.notEquals(
    "total price changed after correction",
    correctedOrderItem.total_price,
    originalOrderItem.total_price,
  );

  // Step 11: Validate historical data preservation
  TestValidator.equals(
    "order item ID remains unchanged",
    correctedOrderItem.id,
    originalOrderItem.id,
  );
  TestValidator.equals(
    "product variant reference preserved",
    correctedOrderItem.shopping_mall_product_variant_id,
    originalOrderItem.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "seller reference preserved",
    correctedOrderItem.shopping_mall_seller_id,
    originalOrderItem.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "order reference preserved",
    correctedOrderItem.shopping_mall_order_id,
    originalOrderItem.shopping_mall_order_id,
  );
  TestValidator.equals(
    "quantity remains unchanged",
    correctedOrderItem.quantity,
    originalOrderItem.quantity,
  );
  TestValidator.equals(
    "product name preserved",
    correctedOrderItem.product_name,
    originalOrderItem.product_name,
  );

  // Step 12: Validate business logic
  TestValidator.predicate(
    "corrected price is lower than original price",
    correctedOrderItem.unit_price < originalOrderItem.unit_price,
  );
  TestValidator.predicate(
    "corrected total reflects quantity correctly",
    Math.abs(
      correctedOrderItem.total_price -
        correctedOrderItem.unit_price * correctedOrderItem.quantity,
    ) < 0.01,
  );

  // Additional validation: Ensure price correction is reasonable
  TestValidator.predicate(
    "price correction represents meaningful discount",
    originalOrderItem.unit_price - correctedOrderItem.unit_price > 0.01,
  );
}
