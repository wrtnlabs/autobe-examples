import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefund";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefund";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_refund_transaction_search_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "SecurePass123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create delivery address for the customer
  const deliveryAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(deliveryAddress);

  // Step 3: Create payment method for the customer
  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      tax_id: RandomGenerator.alphaNumeric(9),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 5: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 6: Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        base_price: typia.random<
          number & tags.Minimum<10> & tags.Maximum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 7: Create SKU for the product
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: `SKU${RandomGenerator.alphaNumeric(8)}`,
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 8: Place order as customer (already authenticated from Step 1)
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: deliveryAddress.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Get the first order ID from response
  typia.assertGuard(orderResponse.order_ids);
  const orderId = typia.assert(orderResponse.order_ids[0]!);

  // Step 9: Submit refund request for the order
  const refundRequest =
    await api.functional.shoppingMall.customer.orders.refund.createRefund(
      connection,
      {
        orderId: orderId,
        body: {
          refund_reason: "defective_damaged",
          refund_description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          refund_amount_requested: typia.random<
            number & tags.Minimum<10> & tags.Maximum<500>
          >(),
        } satisfies IShoppingMallOrder.IRefundCreate,
      },
    );
  typia.assert(refundRequest);

  // Step 10: Search refund transactions
  const refundSearchResult = await api.functional.shoppingMall.refunds.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallRefund.IRequest,
    },
  );
  typia.assert(refundSearchResult);

  // Step 11: Validate search results
  TestValidator.predicate(
    "refund search results should return data array",
    Array.isArray(refundSearchResult.data),
  );

  TestValidator.equals(
    "pagination current page should be 1",
    refundSearchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 10",
    refundSearchResult.pagination.limit,
    10,
  );

  // Step 12: Search with status filter
  const filteredByStatus = await api.functional.shoppingMall.refunds.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies IShoppingMallRefund.IRequest,
    },
  );
  typia.assert(filteredByStatus);

  TestValidator.predicate(
    "filtered search results should return data array",
    Array.isArray(filteredByStatus.data),
  );

  // Step 13: Test pagination with different page size
  const differentPageSize = await api.functional.shoppingMall.refunds.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallRefund.IRequest,
    },
  );
  typia.assert(differentPageSize);

  TestValidator.equals(
    "custom page limit should match request",
    differentPageSize.pagination.limit,
    5,
  );

  // Step 14: Test filtering by order reference
  const filteredByOrder = await api.functional.shoppingMall.refunds.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        shopping_mall_order_id: orderId,
      } satisfies IShoppingMallRefund.IRequest,
    },
  );
  typia.assert(filteredByOrder);

  TestValidator.predicate(
    "order-filtered search should return results",
    Array.isArray(filteredByOrder.data),
  );
}
