import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_review_administrator_at(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing sale review by an authorized administrator.
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join payload, minimal since IJoin is empty object.
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Assign Authorization header with Bearer token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Use a valid UUID for reviewId
  const validReviewId = typia.random<string & tags.Format<"uuid">>();
  const review =
    await api.functional.shoppingMall.administrator.sale_reviews.at(
      adminConnection,
      { reviewId: validReviewId },
    );
  typia.assert(review);
  // Scenario 2: Attempt to retrieve a sale review that does not exist or is soft deleted.
  await TestValidator.httpError("sale review not found", 404, async () => {
    const randomReviewId = typia.random<string & tags.Format<"uuid">>();
    await api.functional.shoppingMall.administrator.sale_reviews.at(
      adminConnection,
      { reviewId: randomReviewId },
    );
  });
  // Scenario 3: Unauthorized access attempt to retrieve sale review without authentication.
  await TestValidator.httpError(
    "unauthorized access to sale review",
    [401, 403],
    async () => {
      const anonymousReviewId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.administrator.sale_reviews.at(
        connection, // base connection without authentication
        { reviewId: anonymousReviewId },
      );
    },
  );
}
