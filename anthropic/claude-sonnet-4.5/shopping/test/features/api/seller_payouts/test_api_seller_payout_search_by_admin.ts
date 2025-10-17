import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test administrator's ability to search and retrieve seller payout records
 * with pagination.
 *
 * This test validates that administrators can successfully search for seller
 * payout records across the entire platform with proper filtering and
 * pagination support. The test creates a complete order lifecycle including
 * admin account, seller account with products, customer account with orders,
 * and then searches for the generated payout records.
 *
 * Workflow:
 *
 * 1. Create admin account for payout search operations
 * 2. Create seller account that will receive payouts
 * 3. Create customer account for placing orders
 * 4. Create delivery address for order fulfillment
 * 5. Create payment method for transaction processing
 * 6. Admin creates product category for catalog organization
 * 7. Seller creates product listing
 * 8. Seller creates SKU variants for the product
 * 9. Customer places order to generate seller revenue
 * 10. Admin searches for seller payout records with pagination
 * 11. Validate response structure and payout information
 */
export async function test_api_seller_payout_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with platform-wide access
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create seller account for payout generation
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 5 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 3: Create customer account for order placement
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 4: Create delivery address for the customer
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "USA",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 5: Create payment method for the customer
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      { body: paymentMethodData },
    );
  typia.assert(paymentMethod);

  // Step 6: Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 7: Seller creates product
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 8: Seller creates SKU for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(sku);

  // Step 9: Customer places order
  const orderData = {
    delivery_address_id: address.id,
    payment_method_id: paymentMethod.id,
    shipping_method: RandomGenerator.pick([
      "standard",
      "express",
      "overnight",
    ] as const),
  } satisfies IShoppingMallOrder.ICreate;

  const orderResponse: IShoppingMallOrder.ICreateResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(orderResponse);

  // Step 10: Admin searches for seller payout records
  const payoutSearchRequest = {
    page: 1,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const payoutPage: IPageIShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.index(connection, {
      body: payoutSearchRequest,
    });
  typia.assert(payoutPage);

  // Step 11: Validate response structure
  TestValidator.predicate(
    "payout page has pagination information",
    payoutPage.pagination !== null && payoutPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "payout page has data array",
    Array.isArray(payoutPage.data),
  );

  TestValidator.predicate(
    "pagination has valid current page",
    payoutPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination has valid limit",
    payoutPage.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination has valid records count",
    payoutPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination has valid pages count",
    payoutPage.pagination.pages >= 0,
  );
}
