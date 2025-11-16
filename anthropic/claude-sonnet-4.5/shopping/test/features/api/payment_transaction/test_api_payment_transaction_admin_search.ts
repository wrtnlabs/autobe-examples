import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin search and retrieval of payment transactions with
 * comprehensive filtering.
 *
 * This test ensures administrators can access and filter payment transaction
 * data across the entire platform for financial auditing, dispute resolution,
 * and monitoring purposes.
 *
 * Workflow:
 *
 * 1. Admin authenticates to gain platform-wide access
 * 2. Admin creates product category for marketplace organization
 * 3. Seller authenticates and creates product sale listing
 * 4. Seller creates SKU variant for the product
 * 5. Buyer authenticates and adds product to cart
 * 6. Buyer creates delivery address
 * 7. Buyer registers payment method
 * 8. Buyer creates order, generating payment transactions
 * 9. Admin searches payment transactions with various filters
 * 10. Validate pagination, transaction data completeness, and filter accuracy
 */
export async function test_api_payment_transaction_admin_search(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({ sentences: 8 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
        weight: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        dimension_length: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        dimension_width: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        dimension_height: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({ sentences: 10 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        compare_at_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        sale_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        cost_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Buyer authenticates
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 7: Buyer adds product to cart
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 8: Buyer creates delivery address
  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
          street_address_line2: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: RandomGenerator.name(1),
          address_label: RandomGenerator.name(1),
          address_type: "residential",
          special_delivery_instructions: RandomGenerator.paragraph({
            sentences: 5,
          }),
          is_default: true,
        } satisfies IShoppingMallBuyerAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 9: Buyer registers payment method
  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number as number,
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >() satisfies number as number,
        billing_name: RandomGenerator.name(),
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Step 10: Buyer creates order (triggers payment transaction)
  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: {
        cart_item_ids: [cartItem.id],
        buyer_address_id: address.id,
        payment_method_id: paymentMethod.id,
        notes: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 11: Admin searches payment transactions (admin is already authenticated from join)
  const allTransactions =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(allTransactions);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    allTransactions.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    allTransactions.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allTransactions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    allTransactions.pagination.pages >= 0,
  );

  // Validate transaction data completeness
  if (allTransactions.data.length > 0) {
    const firstTransaction = allTransactions.data[0];
    typia.assertGuard(firstTransaction!);

    TestValidator.predicate(
      "transaction has valid id format",
      firstTransaction.id.length > 0,
    );
    TestValidator.predicate(
      "transaction has valid transaction_type",
      ["authorization", "capture", "void", "refund"].includes(
        firstTransaction.transaction_type,
      ),
    );
    TestValidator.predicate(
      "transaction has non-negative amount",
      firstTransaction.amount >= 0,
    );
    TestValidator.predicate(
      "transaction has currency code",
      firstTransaction.currency.length > 0,
    );
    TestValidator.predicate(
      "transaction has valid status",
      [
        "pending",
        "authorized",
        "captured",
        "failed",
        "voided",
        "refunded",
      ].includes(firstTransaction.status),
    );
    TestValidator.predicate(
      "transaction has provider name",
      firstTransaction.provider.length > 0,
    );
    TestValidator.predicate(
      "transaction has created_at timestamp",
      firstTransaction.created_at.length > 0,
    );
  }

  // Test filtering by transaction status
  const statusFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          transaction_status: "pending",
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(statusFiltered);

  // Test filtering by buyer_id
  const buyerFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          buyer_id: buyer.id,
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(buyerFiltered);

  // Test filtering by order_id
  const orderFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          order_id: order.id,
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(orderFiltered);

  // Test amount range filtering
  const amountFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          amount_min: 0,
          amount_max: 999999,
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(amountFiltered);

  // Test date range filtering
  const dateStart = new Date(Date.now() - 86400000 * 7).toISOString();
  const dateEnd = new Date(Date.now() + 86400000).toISOString();
  const dateFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          created_at_start: dateStart,
          created_at_end: dateEnd,
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(dateFiltered);

  // Test sorting by created_at descending
  const sortedDesc =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(sortedDesc);

  // Test sorting by amount ascending
  const sortedAsc =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "amount",
          sort_order: "asc",
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(sortedAsc);

  // Test pagination with different page sizes
  const paginatedSmall =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(paginatedSmall);

  TestValidator.predicate(
    "small pagination limit is 5",
    paginatedSmall.pagination.limit === 5,
  );

  // Test search parameter
  const searchFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          search: RandomGenerator.alphaNumeric(5),
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(searchFiltered);

  // Test payment method provider filter
  const providerFiltered =
    await api.functional.shoppingMall.admin.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
          payment_method_provider: "credit_card",
        } satisfies IShoppingMallPaymentTransaction.IRequest,
      },
    );
  typia.assert(providerFiltered);
}
