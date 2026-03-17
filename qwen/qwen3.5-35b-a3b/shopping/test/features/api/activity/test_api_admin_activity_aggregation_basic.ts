import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallActivityAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallActivityAggregation";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallActivityAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallActivityAggregation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_activity_aggregation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - use utility function instead of SDK
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create new connection with admin token for subsequent requests
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // 3. Test aggregation endpoint with basic pagination and grouping
  const requestBody = {
    page: 1,
    limit: 10,
    group_by: ["actor_type", "entity_type", "action_type"] as const,
    actor_types: ["customer", "seller", "admin"] as const,
    sort_by: "count",
    sort_order: "desc" as const,
  } satisfies IEcommerceMallActivityAggregation.IRequest;
  const result =
    await api.functional.ecommerceMall.admin.activity.aggregation.index(
      adminAuthorizedConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // 4. Validate response structure
  typia.assert(result.pagination);
  typia.assert(result.data);
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "records is positive",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages is positive", result.pagination.pages >= 0);
  // 6. Verify each aggregation summary in data array
  for (const summary of result.data) {
    typia.assert(summary);
    // Validate summary structure
    TestValidator.predicate(
      "actor_type is not empty",
      summary.actor_type.length > 0,
    );
    TestValidator.predicate(
      "entity_type is not empty",
      summary.entity_type.length > 0,
    );
    TestValidator.predicate(
      "action_type is not empty",
      summary.action_type.length > 0,
    );
    // Validate count is positive integer
    TestValidator.predicate("count is positive", summary.count > 0);
    // Validate created_at is valid date-time format
    const parsedDate = new Date(summary.created_at);
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(parsedDate.getTime()),
    );
  }
}
