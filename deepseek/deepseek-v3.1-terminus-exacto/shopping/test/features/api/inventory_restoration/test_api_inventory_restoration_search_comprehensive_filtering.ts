import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceModificationInventoryRestoration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_restoration_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Calculate date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Execute search with comprehensive filters
  const searchResult =
    await api.functional.ecommerce.administrator.modification_inventory_restorations.index(
      adminConnection,
      {
        body: {
          restoration_reason: "cancellation",
          created_at_after: thirtyDaysAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array size matches limit
  TestValidator.predicate(
    "data array size within limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
  // Validate each restoration record
  for (const record of searchResult.data) {
    TestValidator.predicate(
      `restoration reason contains 'cancellation' for record ${record.id}`,
      record.restoration_reason.includes("cancellation"),
    );
    // Validate creation date is within the last 30 days
    const recordDate = new Date(record.created_at);
    TestValidator.predicate(
      `creation date within last 30 days for record ${record.id}`,
      recordDate >= thirtyDaysAgo && recordDate <= now,
    );
    // Validate required fields exist
    TestValidator.predicate(
      `quantity restored positive for record ${record.id}`,
      record.quantity_restored >= 0,
    );
    TestValidator.predicate(
      `restoration reason exists for record ${record.id}`,
      record.restoration_reason.length > 0,
    );
    TestValidator.predicate(
      `inventory record ID exists for record ${record.id}`,
      record.ecommerce_inventory_record_id.length > 0,
    );
  }
}
