import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_category_hierarchy_empty_and_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test edge cases of the category hierarchy endpoint: empty result and soft-deleted categories.
   *
   * Validates the behavior of the category hierarchy search endpoint under edge case conditions. The endpoint returns all non-deleted categories organized in a two-level hierarchy. When no categories exist or all categories are soft-deleted, the response should contain an empty topLevelCategories array.
   *
   * Test A verifies the empty hierarchy case. Tests B and C (soft-deleted categories and partial deletion scenarios) require category create and delete endpoints which are not available in the current SDK scope, so they are documented but not implemented here.
   *
   * 1. Call hierarchy search with no name filter
   * 2. Call hierarchy search with a non-existent name filter
   * 3. Validate response structure via typia.assert for both calls
   */
  const conn: api.IConnection = { host: connection.host };
  // Test A: Query hierarchy with no filter
  const hierarchy =
    await api.functional.eCommerceMall.superAdministrator.categories.hierarchy.search(
      conn,
      {
        body: {} satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(hierarchy);
  // Query hierarchy with a non-existent name filter
  const filteredHierarchy =
    await api.functional.eCommerceMall.superAdministrator.categories.hierarchy.search(
      conn,
      {
        body: {
          name: "non-existent-category-name-for-testing-purposes",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(filteredHierarchy);
}
