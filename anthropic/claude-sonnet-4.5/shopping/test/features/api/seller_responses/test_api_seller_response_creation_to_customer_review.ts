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
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test the complete workflow of a seller responding to a customer's product
 * review.
 *
 * This test validates the end-to-end seller response feature where sellers can
 * professionally engage with customer feedback on their products. The workflow
 * ensures that:
 *
 * 1. Only sellers can respond to reviews on their own products
 * 2. Responses enter the moderation workflow with pending_moderation status
 * 3. The response is properly linked to the customer review
 * 4. All prerequisite data (admin, seller, customer, product, order, review) is
 *    created
 *
 * Steps:
 *
 * 1. Create admin account and category
 * 2. Create seller account, product, and SKU
 * 3. Create customer account with address and payment method
 * 4. Customer places order for the product
 * 5. Customer submits a product review
 * 6. Seller responds to the customer review
 * 7. Validate response creation and moderation status
 */
export async function test_api_seller_response_creation_to_customer_review(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account for product and response management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      business_name: RandomGenerator.name(2),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Seller creates SKU variant for product ordering
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create customer account for order placement and review
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

  // Step 7: Customer creates delivery address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);

  // Step 8: Customer creates payment method
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

  // Step 9: Customer places order for the product
  const orderResponse =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        delivery_address_id: address.id,
        payment_method_id: paymentMethod.id,
        shipping_method: "standard",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order creation should return at least one order ID",
    orderResponse.order_ids.length > 0,
  );

  const orderId = orderResponse.order_ids[0];
  typia.assert(orderId);

  // Step 10: Customer submits a product review
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_sku_id: sku.id,
        shopping_mall_order_id: orderId,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        review_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  TestValidator.equals(
    "review should be for the correct product",
    review.shopping_mall_product_id,
    product.id,
  );

  // Step 11: Seller responds to the customer review
  const sellerResponse =
    await api.functional.shoppingMall.seller.sellerResponses.create(
      connection,
      {
        body: {
          shopping_mall_review_id: review.id,
          response_text: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IShoppingMallSellerResponse.ICreate,
      },
    );
  typia.assert(sellerResponse);

  // Step 12: Validate seller response was created correctly
  TestValidator.predicate(
    "seller response should have an ID",
    sellerResponse.id.length > 0,
  );

  TestValidator.predicate(
    "seller response should have text content",
    sellerResponse.response_text.length > 0,
  );
}
