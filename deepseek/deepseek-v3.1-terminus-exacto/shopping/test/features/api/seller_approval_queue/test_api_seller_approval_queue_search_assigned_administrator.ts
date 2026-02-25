import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test filtering by assigned administrator functionality for seller approval queue search.
 * 1. Authenticate as administrator using authorize_administrator_join
 * 2. Search for approval queues assigned to the current administrator
 * 3. Validate that only assigned requests are returned with correct administrator info
 * 4. Test pagination behavior with assigned results
 */
export async function test_api_seller_approval_queue_search_assigned_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {});
  typia.assert(administrator);
  // Step 2: Search for approval queues assigned to the current administrator
  const searchResult =
    await api.functional.ecommerce.administrator.seller_approval_queues.index(
      adminConnection,
      {
        body: {
          administrator_id: administrator.id,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfSeller.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 3: Validate that all returned entries are assigned to the current administrator
  if (searchResult.data.length > 0) {
    for (const queueEntry of searchResult.data) {
      TestValidator.predicate(
        "queue entry has administrator assigned",
        queueEntry.administrator !== null &&
          queueEntry.administrator !== undefined,
      );
      TestValidator.equals(
        "administrator ID matches current administrator",
        queueEntry.administrator!.id,
        administrator.id,
      );
      TestValidator.equals(
        "administrator email matches",
        queueEntry.administrator!.email,
        administrator.email,
      );
    }
  }
  // Step 4: Test pagination metadata
  TestValidator.predicate(
    "pagination current page",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages",
    searchResult.pagination.pages >= 0,
  );
  // Step 5: Validate pagination consistency
  if (searchResult.pagination.current < searchResult.pagination.pages) {
    const nextPageResult =
      await api.functional.ecommerce.administrator.seller_approval_queues.index(
        adminConnection,
        {
          body: {
            administrator_id: administrator.id,
            page: searchResult.pagination.current + 1,
            limit: searchResult.pagination.limit,
          } satisfies IEcommercePlatformEventOfSeller.IRequest,
        },
      );
    typia.assert(nextPageResult);
    // Validate that results don't overlap between pages
    if (searchResult.data.length > 0 && nextPageResult.data.length > 0) {
      const pageIds = new Set(searchResult.data.map((entry) => entry.id));
      const nextPageIds = new Set(nextPageResult.data.map((entry) => entry.id));
      TestValidator.predicate(
        "no duplicate entries between pages",
        !Array.from(pageIds).some((id) => nextPageIds.has(id)),
      );
    }
  }
}
