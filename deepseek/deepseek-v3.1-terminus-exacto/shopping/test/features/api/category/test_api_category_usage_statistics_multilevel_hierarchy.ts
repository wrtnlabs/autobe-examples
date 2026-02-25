import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_usage_statistics_multilevel_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator to access protected endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Query category usage statistics - this is the only available API
  const usageStats =
    await api.functional.ecommerce.administrator.category_usage.at(
      adminConnection,
    );
  typia.assert(usageStats);
  
  // 将 usageStats 断言为包含 products_count 的特定类型
  interface ICategoryUsageStatistics {
    id: string;
    name: string;
    products_count: number;
    created_at: string;
  }
  
  const stats = typia.assert<ICategoryUsageStatistics>(usageStats);
  
  // Validate basic response structure
  TestValidator.predicate("has required id property", "id" in stats);
  TestValidator.predicate("has required name property", "name" in stats);
  TestValidator.predicate(
    "has products_count property",
    "products_count" in stats,
  );
  TestValidator.predicate(
    "has created_at property",
    "created_at" in stats,
  );
  // Validate data types and constraints
  TestValidator.predicate(
    "products count is non-negative integer",
    stats.products_count >= 0 &&
      Number.isInteger(stats.products_count),
  );
  TestValidator.predicate(
    "created_at is valid ISO date string",
    !isNaN(Date.parse(stats.created_at)) &&
      stats.created_at.includes("T"),
  );
  // Validate UUID format for category ID
  TestValidator.predicate(
    "id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stats.id,
    ),
  );
  // Validate name is non-empty string
  TestValidator.predicate(
    "name is non-empty string",
    typeof stats.name === "string" && stats.name.length > 0,
  );
}