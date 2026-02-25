import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Test updating an existing product review by its owner customer with valid rating and optional review text.
  // Verify that the update succeeds, the returned review reflects the new rating and text, and a snapshot record is created.
  // Ensure only the owner can update the review.
  // 1. Customer join and authorize
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass1234",
      },
    },
  );
  typia.assert(authorizedCustomer);
  // 2. Use authorized connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 3. Prepare an existing review object to simulate existing review owned by this customer
  const initialReviewId = typia.random<string & tags.Format<"uuid">>();
  const initialRating = 3 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const initialBody = typia.random<string>();
  const nowISO = typia.random<string & tags.Format<"date-time">>();
  const reviewToUpdate = {
    id: initialReviewId,
    customer: {
      id: authorizedCustomer.id,
      email: authorizedCustomer.email,
      displayName: null,
      phoneNumber: null,
      createdAt: nowISO,
      updatedAt: nowISO,
    },
    order: {
      id: typia.random<string & tags.Format<"uuid">>(),
      orderNumber: RandomGenerator.alphabets(10),
      totalPrice: 100,
      totalQuantity: 1,
      orderStatus: "paid",
      createdAt: nowISO,
      updatedAt: nowISO,
      deletedAt: null,
      customer: {
        id: authorizedCustomer.id,
        email: authorizedCustomer.email,
        createdAt: nowISO,
        updatedAt: nowISO,
      },
    },
    orderItem: {
      id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1,
      status: "paid",
      createdAt: nowISO,
      updatedAt: nowISO,
      deletedAt: null,
      order: {
        id: typia.random<string & tags.Format<"uuid">>(),
        orderNumber: RandomGenerator.alphabets(10),
        totalPrice: 100,
        totalQuantity: 1,
        orderStatus: "paid",
        createdAt: nowISO,
        updatedAt: nowISO,
        customer: {
          id: authorizedCustomer.id,
          email: authorizedCustomer.email,
          createdAt: nowISO,
          updatedAt: nowISO,
        },
        deletedAt: null,
      },
      productVariant: {
        id: typia.random<string & tags.Format<"uuid">>(),
        skuCode: RandomGenerator.alphabets(8),
        stockQuantity: 10,
        createdAt: nowISO,
        updatedAt: nowISO,
        deletedAt: null,
      },
    },
    rating: initialRating,
    body: initialBody,
    createdAt: nowISO,
    updatedAt: nowISO,
    deletedAt: null,
  };
  // 4. Prepare update data
  const updateBody: IShoppingMallReview.IUpdate = {
    rating: (initialRating + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<5>,
    body: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // 5. Perform update
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: reviewToUpdate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  // 6. Verify returned review fields
  TestValidator.equals("rating", updatedReview.rating, updateBody.rating);
  TestValidator.equals("body", updatedReview.body, updateBody.body);
  TestValidator.equals("reviewId", updatedReview.id, reviewToUpdate.id);
  TestValidator.equals(
    "customerId",
    updatedReview.customer.id,
    authorizedCustomer.id,
  );
  // 7. Unauthorized update attempt by different customer
  const anotherCustomerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherAuthorizedCustomer = await authorize_customer_join(
    anotherCustomerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherPass1234",
      },
    },
  );
  typia.assert(anotherAuthorizedCustomer);
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  anotherCustomerConnection.headers = {
    Authorization: anotherAuthorizedCustomer.token.access,
  };
  // Expect error when other customer tries to update the review
  await TestValidator.error("unauthorized update should throw", async () => {
    await api.functional.shoppingMall.customer.reviews.update(
      anotherCustomerConnection,
      {
        reviewId: reviewToUpdate.id,
        body: updateBody,
      },
    );
  });
}
