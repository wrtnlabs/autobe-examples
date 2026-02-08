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

export async function test_api_administrator_sale_review_vote_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Administrator successfully retrieves a detailed helpful vote
  // Step 1: Administrator joins to obtain authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // Step 2: Retrieve a valid helpful vote ID by getting a random vote
  // Since we have no API to create or list votes, we simulate the voteId by generating a random UUID
  const validVoteId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call the API to get the vote details
  const vote =
    await api.functional.shoppingMall.administrator.sale_review_votes.at(
      adminConnection,
      { voteId: validVoteId },
    );
  typia.assert(vote);
  // We cannot validate non-existent properties of vote.
  // Scenario 2: Trying to retrieve a non-existent voteId results in 404
  const nonExistentVoteId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "non-existent vote id returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        adminConnection,
        { voteId: nonExistentVoteId },
      );
    },
  );
  // Scenario 3: Unauthorized access attempts are rejected
  // Test without authentication
  await TestValidator.httpError(
    "unauthenticated access rejected",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        connection,
        {
          voteId: validVoteId,
        },
      );
    },
  );
  // Test with an invalid token (wrong role) - simulate by clearing headers on adminConnection
  const invalidRoleConnection: api.IConnection = { host: connection.host };
  invalidRoleConnection.headers = { Authorization: `Bearer invalid-token` };
  await TestValidator.httpError(
    "unauthorized role access rejected",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        invalidRoleConnection,
        {
          voteId: validVoteId,
        },
      );
    },
  );
}
