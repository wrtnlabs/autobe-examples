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

export async function test_api_inventory_restoration_search_date_range_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Calculate date ranges for current week using ISO week (Monday as first day)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset,
  );
  startOfWeek.setHours(0, 0, 0, 0); // Start of Monday
  const wednesday = new Date(startOfWeek.getTime() + 2 * 24 * 60 * 60 * 1000); // Wednesday
  const thursday = new Date(startOfWeek.getTime() + 3 * 24 * 60 * 60 * 1000); // Thursday
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000); // Sunday
  endOfWeek.setHours(23, 59, 59, 999); // End of Sunday
  // 3. Search first half of week (Monday 00:00 to Wednesday 23:59:59)
  const firstHalfSearch =
    await api.functional.ecommerce.administrator.modification_inventory_restorations.index(
      adminConnection,
      {
        body: {
          created_at_after: startOfWeek.toISOString(),
          created_at_before: wednesday.toISOString(),
          limit: 100,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(firstHalfSearch);
  // 4. Search second half of week (Thursday 00:00 to Sunday 23:59:59)
  const secondHalfSearch =
    await api.functional.ecommerce.administrator.modification_inventory_restorations.index(
      adminConnection,
      {
        body: {
          created_at_after: thursday.toISOString(),
          created_at_before: endOfWeek.toISOString(),
          limit: 100,
        } satisfies IEcommerceModificationInventoryRestoration.IRequest,
      },
    );
  typia.assert(secondHalfSearch);
  // 5. Verify no overlapping records (mutually exclusive result sets)
  const firstHalfIds = new Set(firstHalfSearch.data.map((record) => record.id));
  const secondHalfIds = new Set(
    secondHalfSearch.data.map((record) => record.id),
  );
  const overlappingRecords = firstHalfSearch.data.filter((record) =>
    secondHalfIds.has(record.id),
  );
  TestValidator.equals(
    "no overlapping records between date ranges",
    overlappingRecords.length,
    0,
  );
  // 6. Verify timestamps are within respective ranges
  firstHalfSearch.data.forEach((record, index) => {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      `first half record ${index} created within range`,
      createdAt >= startOfWeek && createdAt <= wednesday,
    );
  });
  secondHalfSearch.data.forEach((record, index) => {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      `second half record ${index} created within range`,
      createdAt >= thursday && createdAt <= endOfWeek,
    );
  });
  // 7. Verify result set counts match expectations
  TestValidator.equals(
    "first half records count matches data length",
    firstHalfSearch.data.length,
    firstHalfIds.size,
  );
  TestValidator.equals(
    "second half records count matches data length",
    secondHalfSearch.data.length,
    secondHalfIds.size,
  );
  // 8. Test that pagination metadata is consistent
  TestValidator.predicate(
    "first half pagination metadata valid",
    firstHalfSearch.pagination.records >= firstHalfSearch.data.length,
  );
  TestValidator.predicate(
    "second half pagination metadata valid",
    secondHalfSearch.pagination.records >= secondHalfSearch.data.length,
  );
}
