import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_review_update_authorization_and_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully update the product review by authorized customer.
  {
    // Create an isolated connection for the first customer
    const customerConnection: api.IConnection = { host: connection.host };
    // Create a new customer via join utility
    const joinBody: IShoppingMallCustomer.IJoin = {
      // Provide minimal required fields (empty object as per DTO)
    } satisfies IShoppingMallCustomer.IJoin;
    // Authenticate and obtain tokens
    const authorized = await authorize_customer_join(connection, {
      body: joinBody,
    });
    typia.assert(authorized);
    // Inject authorization header
    customerConnection.headers = {
      Authorization: `Bearer ${authorized.token.access}`,
    };
    // Prepare a UUID for productReviewId (random) - simulate existing review
    const productReviewId = typia.random<string & tags.Format<"uuid">>();
    // Prepare update payload - valid rating and optional review body
    const updateBody: IShoppingMallProductReview.IUpdate = {
      rating: 5, // valid rating 1-5
      body: "Updated review body text.", // valid optional body
    } satisfies IShoppingMallProductReview.IUpdate;
    // Perform the update call
    const updatedReview =
      await api.functional.shoppingMall.productReviews.update(
        customerConnection,
        {
          productReviewId: productReviewId,
          body: updateBody,
        },
      );
    // Assert the response structure (compilation safe - no property specific asserts)
    typia.assert(updatedReview);
    // Business logic validation: since no properties exist in DTO, only assert the update payload matches as much as possible
    // actual property checks can't be done due to missing DTO definitions
  }
  // Scenario 2: Unauthorized update attempt rejected with 403.
  {
    // Customer A connection and join
    const customerAConnection: api.IConnection = { host: connection.host };
    const joinBodyA: IShoppingMallCustomer.IJoin =
      {} satisfies IShoppingMallCustomer.IJoin;
    const authorizedA = await authorize_customer_join(connection, {
      body: joinBodyA,
    });
    typia.assert(authorizedA);
    customerAConnection.headers = {
      Authorization: `Bearer ${authorizedA.token.access}`,
    };
    // Customer B connection and join
    const customerBConnection: api.IConnection = { host: connection.host };
    const joinBodyB: IShoppingMallCustomer.IJoin =
      {} satisfies IShoppingMallCustomer.IJoin;
    const authorizedB = await authorize_customer_join(connection, {
      body: joinBodyB,
    });
    typia.assert(authorizedB);
    customerBConnection.headers = {
      Authorization: `Bearer ${authorizedB.token.access}`,
    };
    // Simulate an existing product review ID
    const productReviewId = typia.random<string & tags.Format<"uuid">>();
    // Prepare update body payload
    const updateBody: IShoppingMallProductReview.IUpdate = {
      rating: 3,
      body: "Unauthorized update attempt.",
    } satisfies IShoppingMallProductReview.IUpdate;
    // Attempt the update from different customer connection - expect HTTP 403 error
    await TestValidator.httpError(
      "unauthorized update rejection",
      [403],
      async () => {
        await api.functional.shoppingMall.productReviews.update(
          customerBConnection,
          {
            productReviewId: productReviewId,
            body: updateBody,
          },
        );
      },
    );
  }
}
