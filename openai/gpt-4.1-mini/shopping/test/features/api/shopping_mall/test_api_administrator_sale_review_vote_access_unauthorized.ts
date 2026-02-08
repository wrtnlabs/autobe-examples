import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_review_vote_access_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Verify that attempts to retrieve a helpful vote by users without administrator authorization are rejected.
  // The test tries to access the endpoint without authentication or with insufficient permissions and expects an authorization error or access denied response.
  // 1. Perform administrator join to establish administrator user and authentication context.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Generate a random UUID vote ID to attempt retrieval (valid UUID format).
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access the sale-review-votes endpoint without authentication (base connection).
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        connection,
        { voteId },
      );
    },
  );
  // 4. Attempt to access the sale-review-votes endpoint with administrator connection but remove Authorization header (simulate insufficient permission).
  const adminConnectionNoHeader: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access with missing token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        adminConnectionNoHeader,
        { voteId },
      );
    },
  );
  // 5. Attempt to access the sale-review-votes endpoint with a malformed or invalid token header (simulate invalid token).
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: "Bearer invalid.token.here",
    },
  };
  await TestValidator.httpError(
    "unauthorized access with invalid token",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        invalidTokenConnection,
        { voteId },
      );
    },
  );
}
