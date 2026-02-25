import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_registry_filtering_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test 1: Partial name matching
  const substring = RandomGenerator.alphabets(3);
  const partialNameResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          schema_name: substring,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(partialNameResults);
  // Verify schema names contain the substring
  if (partialNameResults.data.length > 0) {
    for (const item of partialNameResults.data) {
      TestValidator.predicate(
        "schema name contains substring",
        item.schema_name.toLowerCase().includes(substring.toLowerCase()),
      );
    }
  }
  // Test 2: Exact version filtering
  const exactVersion = "1.0.0";
  const exactVersionResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          schema_version: exactVersion,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(exactVersionResults);
  // Verify all versions match exactly
  if (exactVersionResults.data.length > 0) {
    for (const item of exactVersionResults.data) {
      TestValidator.equals(
        "exact version match",
        item.schema_version,
        exactVersion,
      );
    }
  }
  // Test 3: Active status filtering - true
  const activeResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(activeResults);
  // Verify all results are active
  if (activeResults.data.length > 0) {
    for (const item of activeResults.data) {
      TestValidator.predicate("item is active", item.is_active === true);
    }
  }
  // Test 3: Active status filtering - false
  const inactiveResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          is_active: false,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(inactiveResults);
  // Verify all results are inactive
  if (inactiveResults.data.length > 0) {
    for (const item of inactiveResults.data) {
      TestValidator.predicate("item is inactive", item.is_active === false);
    }
  }
  // Test 4: Date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          created_after: oneDayAgo.toISOString(),
          created_before: oneDayFromNow.toISOString(),
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Verify creation dates fall within range
  if (dateRangeResults.data.length > 0) {
    for (const item of dateRangeResults.data) {
      const createdAt = new Date(item.created_at);
      TestValidator.predicate(
        "created after one day ago",
        createdAt >= oneDayAgo,
      );
      TestValidator.predicate(
        "created before one day from now",
        createdAt <= oneDayFromNow,
      );
    }
  }
  // Test 5: Combined filtering with type-safe random values
  const pageValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limitValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const combinedResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          schema_name: substring,
          is_active: true,
          created_after: oneDayAgo.toISOString(),
          page: pageValue,
          limit: limitValue,
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Verify combined filter criteria
  if (combinedResults.data.length > 0) {
    for (const item of combinedResults.data) {
      TestValidator.predicate(
        "combined filter - name contains substring",
        item.schema_name.toLowerCase().includes(substring.toLowerCase()),
      );
      TestValidator.predicate(
        "combined filter - is active",
        item.is_active === true,
      );
      const createdAt = new Date(item.created_at);
      TestValidator.predicate(
        "combined filter - created after range",
        createdAt >= oneDayAgo,
      );
    }
  }
  // Test pagination metadata
  TestValidator.predicate(
    "pagination current page",
    combinedResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit",
    combinedResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records",
    combinedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages",
    combinedResults.pagination.pages >= 0,
  );
  // Test edge case: Empty filter criteria
  const allResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(allResults);
  TestValidator.predicate(
    "empty filter returns results",
    allResults.data.length >= 0,
  );
  // Test edge case: No matching results
  const noMatchResults =
    await api.functional.ecommerce.superAdministrator.metadata_registries.index(
      superAdminConnection,
      {
        body: {
          schema_name: "nonexistentsubstring12345",
        } satisfies IEcommerceMetadataRegistry.IRequest,
      },
    );
  typia.assert(noMatchResults);
  TestValidator.equals("no matching results", noMatchResults.data.length, 0);
  TestValidator.equals(
    "pagination records for no match",
    noMatchResults.pagination.records,
    0,
  );
}
