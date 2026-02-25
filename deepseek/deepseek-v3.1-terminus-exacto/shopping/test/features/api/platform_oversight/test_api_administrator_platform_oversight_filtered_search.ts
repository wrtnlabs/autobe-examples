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

export async function test_api_administrator_platform_oversight_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Define date range for filtering
  const now = new Date();
  const createdAfter = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const createdBefore = new Date(
    now.getTime() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day future
  // 3. Perform filtered search with specific criteria
  const searchResult =
    await api.functional.ecommerce.administrator.platform_oversight.index(
      adminConnection,
      {
        body: {
          oversight_type: "security_scan",
          severity_level: "critical",
          resolved: false,
          created_after: createdAfter,
          created_before: createdBefore,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformOversight.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate all returned records match filter criteria
  for (const record of searchResult.data) {
    TestValidator.equals(
      "oversight_type must be security_scan",
      record.oversight_type,
      "security_scan",
    );
    TestValidator.equals(
      "severity_level must be critical",
      record.severity_level,
      "critical",
    );
    TestValidator.equals("resolved must be false", record.resolved, false);
    TestValidator.predicate(
      "created_at must be after created_after",
      record.created_at >= createdAfter,
    );
    TestValidator.predicate(
      "created_at must be before created_before",
      record.created_at <= createdBefore,
    );
    typia.assert(record.administrator);
  }
  // 5. Test pagination properties
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "records count should be non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 6. Test that data length respects limit
  TestValidator.predicate(
    "data length should not exceed limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
}
