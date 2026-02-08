import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";

export async function test_api_customer_sale_review_vote_at_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(
    { host: connection.host },
    { body: {} satisfies IShoppingMallCustomer.IJoin },
  );
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Use a valid existing voteId to test retrieval
  const voteId = "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;
  // 3. Retrieve the vote by voteId
  const vote = await api.functional.shoppingMall.customer.sale_review_votes.at(
    customerConnection,
    { voteId },
  );
  typia.assert(vote);
}
