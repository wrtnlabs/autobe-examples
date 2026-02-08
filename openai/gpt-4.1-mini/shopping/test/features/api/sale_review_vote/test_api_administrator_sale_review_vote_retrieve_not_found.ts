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

export async function test_api_administrator_sale_review_vote_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to retrieve a helpful vote with a non-existent voteId by administrator, expecting a 404 Not Found response.
  // 1. Administrator authenticates by joining the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {} satisfies IShoppingMallAdministrator.IJoin,
    });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Generate a random UUID to simulate a non-existent voteId
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the sale review vote with the invalid voteId and expect a 404 error
  await TestValidator.httpError(
    "administrator sale review vote retrieve not found",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_review_votes.at(
        adminConnection,
        {
          voteId,
        },
      );
    },
  );
}
