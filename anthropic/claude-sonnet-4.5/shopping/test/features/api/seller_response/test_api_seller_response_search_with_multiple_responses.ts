import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerResponse";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerResponse";

export async function test_api_seller_response_search_with_multiple_responses(
  connection: api.IConnection,
) {
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  const reviewIds: (string & tags.Format<"uuid">)[] = [];
  const customerCount = 8;

  for (let i = 0; i < customerCount; i++) {
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

    const addressData = {
      recipient_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      address_line1: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      city: RandomGenerator.name(1),
      state_province: RandomGenerator.name(1),
      postal_code: RandomGenerator.alphaNumeric(5),
      country: "USA",
    } satisfies IShoppingMallAddress.ICreate;

    const address: IShoppingMallAddress =
      await api.functional.shoppingMall.customer.addresses.create(connection, {
        body: addressData,
      });
    typia.assert(address);

    const paymentData = {
      payment_type: "credit_card",
      gateway_token: RandomGenerator.alphaNumeric(32),
    } satisfies IShoppingMallPaymentMethod.ICreate;

    const paymentMethod: IShoppingMallPaymentMethod =
      await api.functional.shoppingMall.customer.paymentMethods.create(
        connection,
        {
          body: paymentData,
        },
      );
    typia.assert(paymentMethod);

    const orderData = {
      delivery_address_id: address.id,
      payment_method_id: paymentMethod.id,
      shipping_method: "standard",
    } satisfies IShoppingMallOrder.ICreate;

    const orderResponse: IShoppingMallOrder.ICreateResponse =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderData,
      });
    typia.assert(orderResponse);

    const reviewData = {
      shopping_mall_product_id: product.id,
      shopping_mall_order_id: orderResponse.order_ids[0],
      rating: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      review_text: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
    } satisfies IShoppingMallReview.ICreate;

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: reviewData,
      });
    typia.assert(review);
    reviewIds.push(review.id);
  }

  connection.headers = {
    ...connection.headers,
    Authorization: seller.token.access,
  };

  const createdResponses: IShoppingMallSellerResponse[] = [];

  for (const reviewId of reviewIds) {
    const responseData = {
      shopping_mall_review_id: reviewId,
      response_text: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 8,
      }),
    } satisfies IShoppingMallSellerResponse.ICreate;

    const sellerResponse: IShoppingMallSellerResponse =
      await api.functional.shoppingMall.seller.sellerResponses.create(
        connection,
        {
          body: responseData,
        },
      );
    typia.assert(sellerResponse);
    createdResponses.push(sellerResponse);
  }

  const searchRequest = {
    page: 1,
  } satisfies IShoppingMallSellerResponse.IRequest;

  const searchResult: IPageIShoppingMallSellerResponse.ISummary =
    await api.functional.shoppingMall.seller.sellerResponses.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "pagination object exists and is valid",
    searchResult.pagination !== null &&
      searchResult.pagination !== undefined &&
      typeof searchResult.pagination.current === "number" &&
      typeof searchResult.pagination.limit === "number" &&
      typeof searchResult.pagination.records === "number" &&
      typeof searchResult.pagination.pages === "number",
  );

  TestValidator.predicate(
    "data array exists and is array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "total records matches or exceeds created responses",
    searchResult.pagination.records >= createdResponses.length,
  );

  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);

  TestValidator.predicate(
    "all responses have valid structure",
    searchResult.data.every(
      (response) =>
        typeof response.id === "string" &&
        response.id.length > 0 &&
        typeof response.response_text === "string" &&
        response.response_text.length > 0,
    ),
  );

  const createdResponseIds = new Set(createdResponses.map((r) => r.id));
  const returnedResponseIds = searchResult.data.map((r) => r.id);

  TestValidator.predicate(
    "at least some returned responses match created responses",
    returnedResponseIds.some((id) => createdResponseIds.has(id)),
  );

  if (searchResult.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
    } satisfies IShoppingMallSellerResponse.IRequest;

    const secondPageResult: IPageIShoppingMallSellerResponse.ISummary =
      await api.functional.shoppingMall.seller.sellerResponses.index(
        connection,
        {
          body: secondPageRequest,
        },
      );
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page current is 2",
      secondPageResult.pagination.current,
      2,
    );

    const firstPageIds = new Set(searchResult.data.map((r) => r.id));
    const secondPageIds = secondPageResult.data.map((r) => r.id);

    TestValidator.predicate(
      "no duplicate IDs across pages",
      secondPageIds.every((id) => !firstPageIds.has(id)),
    );
  }
}
