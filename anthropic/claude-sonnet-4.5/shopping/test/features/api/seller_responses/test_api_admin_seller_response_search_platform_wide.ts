import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerResponse";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";

/**
 * Test admin capability to search and filter seller responses across the entire
 * platform.
 *
 * This test validates that administrators have unrestricted visibility into all
 * seller responses regardless of seller ownership. Creates a complex
 * multi-seller environment with multiple products, reviews, and seller
 * responses, then verifies that admins can search all responses platform-wide
 * for moderation purposes.
 *
 * Test Flow:
 *
 * 1. Create admin account for platform oversight
 * 2. Create first seller account and product
 * 3. Create second seller account and product
 * 4. Create customer account and complete order workflow
 * 5. Customer creates reviews on products from both sellers
 * 6. First seller creates response to their review
 * 7. Second seller creates response to their review
 * 8. Admin searches all seller responses with platform-wide visibility
 * 9. Validate pagination structure and cross-seller response visibility
 */
export async function test_api_admin_seller_response_search_platform_wide(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = typia.random<string & tags.MinLength<8>>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerA);

  const productA = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);

  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = typia.random<string & tags.MinLength<8>>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      business_name: RandomGenerator.name(2),
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerB);

  const productB = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 4 }),
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
        country: "USA",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: "credit_card",
          gateway_token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  const orderIdA = orderResponse.order_ids[0];
  typia.assertGuard(orderIdA);

  const reviewA = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: productA.id,
        shopping_mall_order_id: orderIdA,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewA);

  const reviewB = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: productB.id,
        shopping_mall_order_id: orderIdA,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(reviewB);

  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });

  const responseA =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: reviewA.id,
          response_text: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(responseA);

  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      business_name: RandomGenerator.name(2),
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });

  const responseB =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: reviewB.id,
          response_text: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(responseB);

  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const searchResult =
    await api.functional.shoppingMall.admin.sellerResponses.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallSellerResponse.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result should have pagination structure",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "search result should have data array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "admin should see responses from multiple sellers",
    searchResult.data.length >= 2,
  );

  TestValidator.predicate(
    "pagination should have valid structure",
    searchResult.pagination.current === 1 &&
      searchResult.pagination.limit >= 0 &&
      searchResult.pagination.records >= 2 &&
      searchResult.pagination.pages >= 1,
  );

  const foundResponseA = searchResult.data.find((r) => r.id === responseA.id);
  const foundResponseB = searchResult.data.find((r) => r.id === responseB.id);

  TestValidator.predicate(
    "admin should see seller A response",
    foundResponseA !== undefined,
  );

  TestValidator.predicate(
    "admin should see seller B response",
    foundResponseB !== undefined,
  );
}
