import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_search_date_ranges(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple super administrator accounts with different creation timestamps
  // Note: In a real implementation, we would create test super admin accounts here
  // but since the API doesn't provide creation endpoints, we'll test with existing data
  // Test 1: Valid date range with inclusive boundaries
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString();
  const validSearchResponse =
    await api.functional.ecommerce.super_administrators.index(connection, {
      body: {
        created_at_start: yesterday,
        created_at_end: today,
      } satisfies IEcommerceSuperAdministrator.IRequest,
    });
  typia.assert(validSearchResponse);
  // Test 2: Invalid date range (start date after end date)
  await TestValidator.error("should handle invalid date range", async () => {
    await api.functional.ecommerce.super_administrators.index(connection, {
      body: {
        created_at_start: today,
        created_at_end: yesterday,
      } satisfies IEcommerceSuperAdministrator.IRequest,
    });
  });
  // Test 3: Partial date range (only start date)
  const startOnlyResponse =
    await api.functional.ecommerce.super_administrators.index(connection, {
      body: {
        created_at_start: yesterday,
      } satisfies IEcommerceSuperAdministrator.IRequest,
    });
  typia.assert(startOnlyResponse);
  // Test 4: Partial date range (only end date)
  const endOnlyResponse =
    await api.functional.ecommerce.super_administrators.index(connection, {
      body: {
        created_at_end: today,
      } satisfies IEcommerceSuperAdministrator.IRequest,
    });
  typia.assert(endOnlyResponse);
  // Test 5: Date range with pagination
  const paginatedResponse =
    await api.functional.ecommerce.super_administrators.index(connection, {
      body: {
        created_at_start: yesterday,
        created_at_end: today,
        page: 1,
        limit: 10,
      } satisfies IEcommerceSuperAdministrator.IRequest,
    });
  typia.assert(paginatedResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination data",
    paginatedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has records array",
    Array.isArray(paginatedResponse.data),
  );
}
