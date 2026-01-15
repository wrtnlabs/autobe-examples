import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfigHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfigHistory";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_history_retrieval_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Set date range for filtering: last 7 days with ISO 8601 format
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Query configuration history with date range filter
  const response =
    await api.functional.shoppingMall.admin.config.histories.index(
      adminConnection,
      {
        body: {
          created_at_from: oneWeekAgo.toISOString() as string &
            tags.Format<"date-time">,
          created_at_to: now.toISOString() as string & tags.Format<"date-time">,
          page: 1,
          limit: 25,
        } satisfies IShoppingMallConfigHistory.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination page matches",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    response.pagination.limit,
    25,
  );
  TestValidator.predicate("has records", response.data.length > 0);
  TestValidator.predicate(
    "records count is accurate",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    response.pagination.pages >= 1,
  );
  // Validate descending chronological order (strict > for unique timestamps)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at);
    const next = new Date(response.data[i + 1].created_at);
    TestValidator.predicate(
      "records in strictly descending chronological order",
      current > next,
    );
  }
}
