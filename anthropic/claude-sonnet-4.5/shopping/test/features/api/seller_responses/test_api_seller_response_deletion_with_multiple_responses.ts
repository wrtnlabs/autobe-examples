import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test seller response deletion with multiple responses across different
 * reviews.
 *
 * This test validates the soft-delete behavior of seller responses where
 * deleting one response should not affect other independent responses. The test
 * creates multiple products, reviews, and seller responses, then deletes one
 * specific response and validates the deletion succeeded.
 *
 * Note: Due to API limitations (no endpoint to retrieve seller responses for
 * validation), this test can only verify that the deletion operation succeeds
 * without error. Full validation of deleted_at timestamps and other responses
 * remaining active would require additional API endpoints.
 */
export async function test_api_seller_response_deletion_with_multiple_responses(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
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

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create multiple products as seller
  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  const product3 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product3);

  // Step 5: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 6: Create delivery address as customer
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "USA",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 7: Create payment method as customer
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

  // Step 8: Create order to enable verified purchase reviews
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  // Step 9: Create multiple customer reviews for different products
  const review1 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product1.id,
        shopping_mall_order_id: orderResponse.order_ids[0],
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        review_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);

  const review2 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product2.id,
        shopping_mall_order_id: orderResponse.order_ids[0],
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        review_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);

  const review3 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product3.id,
        shopping_mall_order_id: orderResponse.order_ids[0],
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        review_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review3);

  // Step 10: Re-authenticate as seller to create responses
  // Note: The API only provides join endpoints, not login endpoints.
  // Since join creates a new account and authenticates, we create a new seller
  // context for response creation. In a production API, a login endpoint would
  // be used here instead.
  const sellerForResponses = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(),
      business_type: "Corporation",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(sellerForResponses);

  // Step 11: Create seller responses to each review
  const response1 =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: review1.id,
          response_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(response1);

  const response2 =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: review2.id,
          response_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(response2);

  const response3 =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: review3.id,
          response_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(response3);

  // Step 12: Delete the second seller response (response2)
  // This verifies that the deletion API endpoint works correctly
  await api.functional.shoppingMall.seller.sellerResponses.erase(connection, {
    responseId: response2.id,
  });

  // Step 13: The test validates that the deletion operation succeeded without errors.
  // In a complete implementation with response retrieval endpoints, we would:
  // 1. Fetch all seller responses
  // 2. Verify response2 has deleted_at timestamp set
  // 3. Verify response1 and response3 have null deleted_at (still active)
  // 4. Confirm each response maintains independent lifecycle
}
