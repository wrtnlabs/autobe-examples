import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_oversight_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Search for unresolved critical oversight records from last 30 days
  const searchResult =
    await api.functional.ecommerce.administrator.platform_oversights.index(
      adminConnection,
      {
        body: {
          severity_level: "critical" as const,
          resolved: false,
          created_after: thirtyDaysAgo,
          page: 1,
          limit: 20,
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination data",
    searchResult.pagination !== null,
  );
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 20", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate each oversight record matches filter criteria
  for (const oversight of searchResult.data) {
    typia.assert(oversight);
    // Validate filter criteria
    TestValidator.equals(
      "severity level is critical",
      oversight.severity_level,
      "critical",
    );
    TestValidator.equals("record is unresolved", oversight.resolved, false);
    // Validate oversight properties exist
    TestValidator.predicate("has valid id", oversight.id.length > 0);
    TestValidator.predicate(
      "has oversight type",
      oversight.oversight_type.length > 0,
    );
    TestValidator.predicate(
      "has created timestamp",
      oversight.created_at.length > 0,
    );
    // Validate administrator information
    typia.assert(oversight.administrator);
    TestValidator.predicate(
      "administrator has valid id",
      oversight.administrator.id.length > 0,
    );
    TestValidator.predicate(
      "administrator has email",
      oversight.administrator.email.length > 0,
    );
    TestValidator.predicate(
      "administrator has created timestamp",
      oversight.administrator.created_at.length > 0,
    );
    // Validate created date is within last 30 days
    const createdDate = new Date(oversight.created_at);
    const minimumDate = new Date(thirtyDaysAgo);
    TestValidator.predicate(
      "created within last 30 days",
      createdDate >= minimumDate,
    );
  }
  // Validate pagination consistency
  TestValidator.equals(
    "data length matches pagination limit",
    searchResult.data.length,
    Math.min(searchResult.pagination.limit, searchResult.pagination.records),
  );
}
