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

export async function test_api_customer_review_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to update a non-existent review and expect a not found error.
  // 1. Customer registers and obtains authorized session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare a random reviewId that does not exist in the system
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body with valid rating and optional review body
  const updateBody = {
    rating: 5,
    body: "This review does not exist.",
  } satisfies IShoppingMallReview.IUpdate;
  // 4. Attempt to update the non-existent review
  await TestValidator.httpError(
    "update non-existent review should return 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        customerConnection,
        {
          reviewId: nonExistentReviewId,
          body: updateBody,
        },
      );
    },
  );
}
