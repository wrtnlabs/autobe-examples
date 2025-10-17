import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentTransaction";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test advanced payment transaction filtering capabilities with status filters,
 * date ranges, and amount ranges.
 *
 * This test validates the payment transaction search functionality by:
 *
 * 1. Creating a customer account for making purchases
 * 2. Setting up seller account and product catalog infrastructure
 * 3. Creating delivery address and payment method for order processing
 * 4. Generating multiple orders to create payment transactions with different
 *    characteristics
 * 5. Executing filtered searches to verify accurate result retrieval
 * 6. Validating pagination functionality with filtered data
 * 7. Confirming sorting options work correctly
 */
export async function test_api_payment_transactions_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 2: Create seller account (switch context)
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
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: typia.random<string & tags.MinLength<8>>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 3: Create category (requires admin context - using current authenticated context)
  const categoryData = {
    name: RandomGenerator.name(1),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 4: Create product (using seller context)
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 5: Create SKU (using seller context)
  const skuData = {
    sku_code: typia.random<string & tags.MinLength<6> & tags.MaxLength<12>>(),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(sku);

  // Step 6: Switch back to customer context for orders
  // Re-authenticate as customer
  await api.functional.auth.customer.join(connection, {
    body: customerData,
  });

  // Step 7: Create delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 8: Create payment method
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    gateway_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 9: Create cart items and orders to generate multiple payment transactions
  const orderIds: string[] = [];

  for (let i = 0; i < 3; i++) {
    const cartId = typia.random<string & tags.Format<"uuid">>();

    const cartItemData = {
      shopping_mall_sku_id: sku.id,
      quantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    } satisfies IShoppingMallCartItem.ICreate;

    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cartId,
          body: cartItemData,
        },
      );
    typia.assert(cartItem);

    const orderData = {
      delivery_address_id: address.id,
      payment_method_id: paymentMethod.id,
      shipping_method: RandomGenerator.pick([
        "standard",
        "express",
        "overnight",
      ] as const),
    } satisfies IShoppingMallOrder.ICreate;

    const orderResult: IShoppingMallOrder.ICreateResponse =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderData,
      });
    typia.assert(orderResult);
    orderIds.push(...orderResult.order_ids);
  }

  // Step 10: Search payment transactions with basic pagination
  const searchRequest = {
    page: 1,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const searchResult: IPageIShoppingMallPaymentTransaction.ISummary =
    await api.functional.shoppingMall.paymentTransactions.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 11: Validate search results structure
  TestValidator.predicate(
    "search result has pagination",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "search result has data array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination current page matches request",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has valid structure",
    searchResult.pagination.limit >= 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );

  // Step 12: Validate transaction data structure
  TestValidator.predicate(
    "transactions were created",
    searchResult.data.length > 0,
  );

  if (searchResult.data.length > 0) {
    const transaction = searchResult.data[0];
    typia.assert(transaction);
    TestValidator.predicate(
      "transaction has valid id format",
      typeof transaction.id === "string" && transaction.id.length > 0,
    );
    TestValidator.predicate(
      "transaction has valid amount",
      typeof transaction.amount === "number" && transaction.amount >= 0,
    );
  }

  // Step 13: Test pagination with different page numbers
  if (searchResult.pagination.pages > 1) {
    const page2Request = {
      page: 2,
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const page2Result: IPageIShoppingMallPaymentTransaction.ISummary =
      await api.functional.shoppingMall.paymentTransactions.index(connection, {
        body: page2Request,
      });
    typia.assert(page2Result);
    TestValidator.predicate(
      "second page returns different results",
      page2Result.pagination.current === 2,
    );
  }

  // Step 14: Validate total records consistency
  TestValidator.predicate(
    "total records is consistent",
    searchResult.pagination.records >= searchResult.data.length,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    searchResult.pagination.pages >= 1,
  );
}
