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

export async function test_api_payment_transaction_search_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates product category
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: null,
    href: "https://admin.mall.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.mall.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Admin creates product category
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: null,
    display_order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 2: Seller authenticates and creates product sale listing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller1234";
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    business_description: RandomGenerator.content({ paragraphs: 1 }),
    store_name: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://seller.mall.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Seller creates product sale listing
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 8,
    }),
    meta_keywords: null,
    weight: typia.random<number & tags.Minimum<0>>() satisfies number as number,
    dimension_length: null,
    dimension_width: null,
    dimension_height: null,
    manufacturer: RandomGenerator.paragraph({ sentences: 1 }),
    return_policy_days: 14 as const,
    warranty_info: RandomGenerator.paragraph({ sentences: 3 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 3: Seller creates SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    variant_combination: JSON.stringify({ Color: "Red", Size: "M" }),
    base_price: typia.random<
      number & tags.Minimum<0>
    >() satisfies number as number,
    compare_at_price: null,
    sale_price: null,
    sale_start_at: null,
    sale_end_at: null,
    cost_price: null,
    barcode: null,
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 4: Buyer authenticates and adds product to cart
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = "buyer1234";
  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    ip: null,
    href: "https://mall.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://mall.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Buyer adds product to cart
  const cartItemData = {
    shopping_mall_sale_sku_id: sku.id,
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: cartItemData,
      },
    );
  typia.assert(cartItem);

  // Step 5: Buyer creates delivery address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
    street_address_line2: null,
    city: RandomGenerator.paragraph({ sentences: 1 }),
    state: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
    address_label: "Home",
    address_type: "residential",
    special_delivery_instructions: null,
    is_default: true,
  } satisfies IShoppingMallBuyerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
      connection,
      {
        body: addressData,
      },
    );
  typia.assert(address);

  // Step 6: Buyer registers payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<9999>
      >()
      .toString(),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >() satisfies number as number,
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >() satisfies number as number,
    billing_name: RandomGenerator.name(),
    billing_postal_code: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(paymentMethod);

  // Step 7: Buyer creates order (triggers payment processing)
  const orderData = {
    cart_item_ids: [cartItem.id],
    buyer_address_id: address.id,
    payment_method_id: paymentMethod.id,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.buyer.orders.create(
    connection,
    {
      body: orderData,
    },
  );
  typia.assert(order);

  // Verify order was created successfully
  TestValidator.predicate(
    "order should have valid ID",
    order.id !== null && order.id !== undefined,
  );
  TestValidator.predicate("order should contain items", order.items.length > 0);

  // Step 8: Switch to seller context and search payment transactions
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.mall.com/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Search payment transactions with no filters
  const searchNoFilters = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultNoFilters =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchNoFilters,
      },
    );
  typia.assert(resultNoFilters);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    resultNoFilters.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    resultNoFilters.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    resultNoFilters.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    resultNoFilters.pagination.pages >= 0,
  );

  // Validate transaction data array exists
  TestValidator.predicate(
    "transaction data array should exist",
    Array.isArray(resultNoFilters.data),
  );

  // If transactions exist, validate their structure
  if (resultNoFilters.data.length > 0) {
    const firstTransaction = resultNoFilters.data[0];
    typia.assert(firstTransaction);

    TestValidator.predicate(
      "transaction should have valid ID",
      firstTransaction.id !== null && firstTransaction.id !== undefined,
    );
    TestValidator.predicate(
      "transaction should have valid type",
      ["authorization", "capture", "void", "refund"].includes(
        firstTransaction.transaction_type,
      ),
    );
    TestValidator.predicate(
      "transaction should have valid amount",
      firstTransaction.amount >= 0,
    );
    TestValidator.predicate(
      "transaction should have currency",
      firstTransaction.currency.length > 0,
    );
    TestValidator.predicate(
      "transaction should have valid status",
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
      "transaction should have provider",
      firstTransaction.provider.length > 0,
    );
  }

  // Test pagination with different page sizes
  const searchWithPagination = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultPaginated =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchWithPagination,
      },
    );
  typia.assert(resultPaginated);

  TestValidator.equals(
    "pagination limit should match request",
    resultPaginated.pagination.limit,
    5,
  );

  // Test sorting functionality
  const searchWithSort = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultSorted =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchWithSort,
      },
    );
  typia.assert(resultSorted);

  // Test status filtering if transactions exist
  if (resultNoFilters.data.length > 0) {
    const searchByStatus = {
      page: 1,
      limit: 10,
      transaction_status: resultNoFilters.data[0].status,
    } satisfies IShoppingMallPaymentTransaction.IRequest;

    const resultByStatus =
      await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
        connection,
        {
          orderId: order.id,
          body: searchByStatus,
        },
      );
    typia.assert(resultByStatus);

    // Validate filtered results match status
    if (resultByStatus.data.length > 0) {
      TestValidator.predicate(
        "filtered transactions should match requested status",
        resultByStatus.data.every(
          (t) => t.status === resultNoFilters.data[0].status,
        ),
      );
    }
  }

  // Test provider filtering
  const searchByProvider = {
    page: 1,
    limit: 10,
    payment_method_provider: "credit_card",
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultByProvider =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchByProvider,
      },
    );
  typia.assert(resultByProvider);

  // Test amount range filtering
  const searchByAmount = {
    page: 1,
    limit: 10,
    amount_min: 0,
    amount_max: 1000000,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultByAmount =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchByAmount,
      },
    );
  typia.assert(resultByAmount);

  // Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const searchByDateRange = {
    page: 1,
    limit: 10,
    created_at_start: yesterday.toISOString(),
    created_at_end: tomorrow.toISOString(),
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultByDate =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchByDateRange,
      },
    );
  typia.assert(resultByDate);

  // Test search functionality with general search term
  const searchWithQuery = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphaNumeric(5),
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultWithSearch =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchWithQuery,
      },
    );
  typia.assert(resultWithSearch);

  // Test pagination beyond available pages
  const searchBeyondPages = {
    page: 9999,
    limit: 10,
  } satisfies IShoppingMallPaymentTransaction.IRequest;

  const resultBeyondPages =
    await api.functional.shoppingMall.seller.orders.paymentTransactions.index(
      connection,
      {
        orderId: order.id,
        body: searchBeyondPages,
      },
    );
  typia.assert(resultBeyondPages);

  TestValidator.predicate(
    "pagination beyond pages should return empty or valid data",
    Array.isArray(resultBeyondPages.data),
  );
}
