import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates comprehensive pagination functionality of the admin order search
 * endpoint.
 *
 * This test ensures administrators can efficiently navigate through large order
 * datasets using pagination controls. It validates that pagination metadata is
 * accurate, page navigation works correctly, and edge cases are handled
 * appropriately.
 *
 * Test workflow:
 *
 * 1. Create admin account for authentication
 * 2. Create seller account and product infrastructure (category, sale, SKUs)
 * 3. Create buyer account and complete multiple purchase workflows to generate
 *    test orders
 * 4. Test pagination with various page sizes and page numbers
 * 5. Validate pagination metadata accuracy (current, limit, records, pages)
 * 6. Test edge cases including out-of-range pages and boundary conditions
 */
export async function test_api_order_admin_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for order search access
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.test.com/join",
      referrer: "https://admin.test.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create seller account for product listings
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(1),
      href: "https://seller.test.com/join",
      referrer: "https://seller.test.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create category for product organization
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminPassword,
      href: "https://admin.test.com/login",
      referrer: "https://admin.test.com/home",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: sellerPassword,
      href: "https://seller.test.com/login",
      referrer: "https://seller.test.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Size: "M", Color: "Blue" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create multiple buyers and orders for pagination testing
  const orderIds: string[] = [];
  const buyerCount = 25; // Create enough orders for meaningful pagination

  for (let i = 0; i < buyerCount; i++) {
    // Create buyer account
    const buyer = await api.functional.auth.buyer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        href: "https://buyer.test.com/join",
        referrer: "https://buyer.test.com/home",
      } satisfies IShoppingMallBuyer.ICreate,
    });
    typia.assert(buyer);

    // Add product to cart
    const cartItem =
      await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
        connection,
        {
          body: {
            shopping_mall_sale_sku_id: sku.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);

    // Create delivery address
    const address =
      await api.functional.shoppingMall.buyer.buyers.me.addresses.create(
        connection,
        {
          body: {
            recipient_name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
            street_address_line1: RandomGenerator.paragraph({ sentences: 4 }),
            city: RandomGenerator.name(1),
            postal_code: RandomGenerator.alphaNumeric(5),
            country: "South Korea",
            address_label: RandomGenerator.pick([
              "Home",
              "Office",
              "Other",
            ] as const),
            address_type: RandomGenerator.pick([
              "residential",
              "commercial",
            ] as const),
          } satisfies IShoppingMallBuyerAddress.ICreate,
        },
      );
    typia.assert(address);

    // Create payment method
    const paymentMethod =
      await api.functional.shoppingMall.buyer.paymentMethods.create(
        connection,
        {
          body: {
            payment_type: "credit_card",
            provider: "Stripe",
            provider_token: RandomGenerator.alphaNumeric(32),
            card_brand: RandomGenerator.pick(["visa", "mastercard"] as const),
            last_four_digits: typia
              .random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1000> &
                  tags.Maximum<9999>
              >()
              .toString(),
            expiry_month: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
            >(),
            expiry_year: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<2024>
            >(),
            billing_name: RandomGenerator.name(),
            is_default: true,
          } satisfies IShoppingMallPaymentMethod.ICreate,
        },
      );
    typia.assert(paymentMethod);

    // Create order
    const order = await api.functional.shoppingMall.buyer.orders.create(
      connection,
      {
        body: {
          cart_item_ids: [cartItem.id],
          buyer_address_id: address.id,
          payment_method_id: paymentMethod.id,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order);
    orderIds.push(order.id);
  }

  // Step 7: Switch to admin for order search testing
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminPassword,
      href: "https://admin.test.com/login",
      referrer: "https://admin.test.com/dashboard",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 8: Test first page with limit of 10
  const firstPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page should have up to 10 records",
    firstPage.data.length <= 10 && firstPage.data.length > 0,
  );
  TestValidator.predicate(
    "total records should be at least buyerCount",
    firstPage.pagination.records >= buyerCount,
  );

  // Step 9: Test second page
  const secondPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "record count should remain consistent",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );

  // Verify no duplicates between pages
  const firstPageIds = firstPage.data.map((order) => order.id);
  const secondPageIds = secondPage.data.map((order) => order.id);
  const hasDuplicates = firstPageIds.some((id) => secondPageIds.includes(id));
  TestValidator.predicate(
    "pages should not have duplicate orders",
    !hasDuplicates,
  );

  // Step 10: Test different page sizes
  const smallPageSize = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(smallPageSize);

  TestValidator.predicate(
    "small page should respect limit of 5",
    smallPageSize.data.length <= 5,
  );
  TestValidator.equals(
    "small page limit metadata should be 5",
    smallPageSize.pagination.limit,
    5,
  );

  // Step 11: Calculate and verify total pages
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation should be correct",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Step 12: Test last page behavior
  const lastPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: firstPage.pagination.pages,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(lastPage);

  TestValidator.predicate(
    "last page may contain fewer records than limit",
    lastPage.data.length <= 10,
  );

  // Step 13: Test beyond last page (should return empty data)
  const beyondLastPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: firstPage.pagination.pages + 5,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(beyondLastPage);

  TestValidator.equals(
    "beyond last page should return empty data",
    beyondLastPage.data.length,
    0,
  );

  // Step 14: Test large page size
  const largePage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(largePage);

  TestValidator.equals(
    "large page limit should be 50",
    largePage.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large page should contain more records than small pages",
    largePage.data.length >= smallPageSize.data.length,
  );

  // Step 15: Verify pagination consistency across requests
  const consistencyCheck = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(consistencyCheck);

  TestValidator.equals(
    "total records should remain consistent across requests",
    consistencyCheck.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "total pages should remain consistent",
    consistencyCheck.pagination.pages,
    firstPage.pagination.pages,
  );
}
