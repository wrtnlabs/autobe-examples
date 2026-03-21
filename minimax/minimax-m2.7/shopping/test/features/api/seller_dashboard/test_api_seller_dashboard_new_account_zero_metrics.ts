import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_new_account_zero_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account and store credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Authenticate the seller (login to get valid session)
  const loggedInConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(loggedInConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 3: Retrieve the seller dashboard summary
  const summary =
    await api.functional.ecommerceMall.seller.dashboard.summary.at(
      loggedInConnection,
    );
  typia.assert(summary);
  // Step 4: Validate all metrics are zero for a new seller account
  TestValidator.equals("products_count is 0", summary.products_count, 0);
  TestValidator.equals("order_items_count is 0", summary.order_items_count, 0);
  TestValidator.equals(
    "pending_cancellations_count is 0",
    summary.pending_cancellations_count,
    0,
  );
  TestValidator.equals(
    "pending_refunds_count is 0",
    summary.pending_refunds_count,
    0,
  );
  // Step 5: Validate all count values are integers >= 0
  TestValidator.predicate(
    "products_count is non-negative integer",
    summary.products_count >= 0,
  );
  TestValidator.predicate(
    "order_items_count is non-negative integer",
    summary.order_items_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellations_count is non-negative integer",
    summary.pending_cancellations_count >= 0,
  );
  TestValidator.predicate(
    "pending_refunds_count is non-negative integer",
    summary.pending_refunds_count >= 0,
  );
}
