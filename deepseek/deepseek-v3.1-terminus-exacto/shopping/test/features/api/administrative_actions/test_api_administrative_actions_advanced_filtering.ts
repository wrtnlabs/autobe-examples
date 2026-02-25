import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrative_actions_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Test filtering by text search across general_description
  const searchTerms = ["ORDER", "SELLER", "CUSTOMER", "PRODUCT"] as const;
  for (const term of searchTerms) {
    const searchResult =
      await api.functional.ecommerce.administrator.administrative_actions.index(
        adminConnection,
        {
          body: {
            search: term,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate each returned action contains search term in description
    for (const action of searchResult.data) {
      TestValidator.predicate(
        `action description should contain search term '${term}'`,
        action.general_description.includes(term),
      );
    }
  }
  // 3. Test filtering by date range using ISO string timestamps
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dateFilterResult =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          createdAt_from: oneWeekAgo.toISOString(),
          createdAt_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  // Verify all actions are within the specified date range
  for (const action of dateFilterResult.data) {
    const actionDate = new Date(action.created_at);
    const fromDate = new Date(oneWeekAgo.toISOString());
    const toDate = new Date(now.toISOString());
    TestValidator.predicate(
      `action created_at should be >= oneWeekAgo`,
      actionDate.getTime() >= fromDate.getTime(),
    );
    TestValidator.predicate(
      `action created_at should be <= now`,
      actionDate.getTime() <= toDate.getTime(),
    );
  }
  // 4. Test combined filters: search + date range
  const combinedResult =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          search: "ORDER",
          createdAt_from: twoWeeksAgo.toISOString(),
          createdAt_to: now.toISOString(),
          page: 1,
          limit: 15,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate all conditions are met
  for (const action of combinedResult.data) {
    TestValidator.predicate(
      `action description should contain 'ORDER'`,
      action.general_description.includes("ORDER"),
    );
    const actionDate = new Date(action.created_at);
    const fromDate = new Date(twoWeeksAgo.toISOString());
    const toDate = new Date(now.toISOString());
    TestValidator.predicate(
      `action should be within two-week date range`,
      actionDate.getTime() >= fromDate.getTime() &&
        actionDate.getTime() <= toDate.getTime(),
    );
  }
  // 5. Test pagination behavior with filters
  const paginationResult =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          search: "UPDATE",
          page: 2,
          limit: 3,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit should match request limit",
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination current page should match request page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "total records should be >= data length",
    paginationResult.pagination.records >= paginationResult.data.length,
  );
  TestValidator.predicate(
    "total pages should be >= 1",
    paginationResult.pagination.pages >= 1,
  );
  // 6. Test filtering with null/undefined values (no filter)
  const noFilterResult =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          search: null,
          createdAt_from: null,
          createdAt_to: null,
          userType: null,
          accountStatus: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(noFilterResult);
  TestValidator.predicate(
    "unfiltered search should return results",
    noFilterResult.data.length >= 0,
  );
  // 7. Test edge case: very old date range (should return empty or few results)
  const oldDateRangeResult =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          createdAt_from: new Date(0).toISOString(), // January 1, 1970
          createdAt_to: new Date(2020, 0, 1).toISOString(), // January 1, 2020
          page: 1,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(oldDateRangeResult);
  // Validate all returned actions are within the old date range
  for (const action of oldDateRangeResult.data) {
    const actionDate = new Date(action.created_at);
    const fromDate = new Date(0);
    const toDate = new Date(2020, 0, 1);
    TestValidator.predicate(
      `action should be within old date range (1970-2020)`,
      actionDate.getTime() >= fromDate.getTime() &&
        actionDate.getTime() <= toDate.getTime(),
    );
  }
  // 8. Test with limit at maximum allowed (100)
  const maxLimitResult =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "limit should be at maximum 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length should be <= limit",
    maxLimitResult.data.length <= 100,
  );
}
