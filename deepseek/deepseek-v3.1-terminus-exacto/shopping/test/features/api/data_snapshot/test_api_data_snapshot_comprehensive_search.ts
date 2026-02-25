import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDataSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_data_snapshot_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<IEcommerceAdministrator.IJoin>,
  });
  typia.assert(authorized);
  // 2. Test default pagination
  const defaultPage =
    await api.functional.ecommerce.administrator.data_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate("pagination metadata present", () => {
    return (
      defaultPage.pagination.current === 1 &&
      defaultPage.pagination.limit === 20 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0
    );
  });
  // 3. Test entity type filtering
  const entityTypes = ["product", "review"] as const;
  for (const entityType of entityTypes) {
    const filteredByType =
      await api.functional.ecommerce.administrator.data_snapshots.index(
        adminConnection,
        {
          body: {
            entity_type: entityType,
            page: 1,
            limit: 10,
          } satisfies IEcommerceDataSnapshot.IRequest,
        },
      );
    typia.assert(filteredByType);
    // Validate all returned items have correct entity type
    for (const snapshot of filteredByType.data) {
      typia.assert(snapshot);
      TestValidator.equals(
        `entity_type matches filter for ${entityType}`,
        snapshot.entity_type,
        entityType,
      );
    }
  }
  // 4. Test creator filtering (simulate with potential IDs)
  const creatorCustomerId = typia.random<string & tags.Format<"uuid">>();
  const creatorFiltered =
    await api.functional.ecommerce.administrator.data_snapshots.index(
      adminConnection,
      {
        body: {
          creator_customer_id: creatorCustomerId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(creatorFiltered);
  // Note: Actual filtering validation depends on data existence
  // 5. Test date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateFiltered =
    await api.functional.ecommerce.administrator.data_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_after: pastDate,
          created_at_before: now,
          page: 1,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // 6. Test search text in change description
  const searchFiltered =
    await api.functional.ecommerce.administrator.data_snapshots.index(
      adminConnection,
      {
        body: {
          change_description_search: "update",
          page: 1,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(searchFiltered);
  // 7. Test entity_ids filtering with non-existent IDs
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentFiltered =
    await api.functional.ecommerce.administrator.data_snapshots.index(
      adminConnection,
      {
        body: {
          entity_ids: [nonExistentId],
          page: 1,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentFiltered);
  TestValidator.predicate(
    "non-existent entity IDs return empty results",
    () => {
      return nonExistentFiltered.data.length === 0;
    },
  );
  // 8. Validate that all returned snapshots exist (using typia.assert)
  const allSnapshots = [
    ...defaultPage.data,
    ...dateFiltered.data,
    ...searchFiltered.data,
  ];
  // typia.assert ensures all required fields are present with correct types and formats
  for (const snapshot of allSnapshots) {
    if (!snapshot) continue;
    typia.assert(snapshot); // This validates ALL required fields and formats
  }
  // 9. Validate pagination calculations
  TestValidator.predicate("pagination records calculation", () => {
    return defaultPage.pagination.records >= defaultPage.data.length;
  });
  if (defaultPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records / limit",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
}
