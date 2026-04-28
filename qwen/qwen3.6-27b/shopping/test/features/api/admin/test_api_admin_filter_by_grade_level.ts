import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_filter_by_grade_level(
  connection: api.IConnection,
) {
  /**
   * Test filtering administrator accounts by grade level using the isSuper parameter.
   *
   * Validates that the PATCH /ecommercePlatform/admins endpoint correctly applies grade level filtering to administrator account listings. When isSuper is set to true, only super administrators should be returned; when set to false, only regular administrators should be returned.
   *
   * Special attention is given to verifying that every returned administrator matches the specified grade level filter, and that pagination works correctly with filtered datasets.
   *
   * 1. Query administrators with isSuper=true to retrieve only super administrators.
   * 2. Validate all returned administrators have is_super=true.
   * 3. Query administrators with isSuper=false to retrieve only regular administrators.
   * 4. Validate all returned administrators have is_super=false.
   * 5. Test pagination with filtered results using page and limit parameters.
   */
  // Create connection for API calls (no authorization required for this endpoint)
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Query with isSuper=true to get super administrators
  const superAdmins = await api.functional.ecommercePlatform.admins.index(
    adminConnection,
    {
      body: {
        isSuper: true,
      } satisfies IEcommercePlatformAdmin.IRequest,
    },
  );
  typia.assert(superAdmins);
  // Validate all returned super admins have is_super=true
  if (superAdmins.data.length > 0) {
    TestValidator.predicate(
      "all results have is_super=true when filtering by isSuper=true",
      superAdmins.data.every((admin) => admin.is_super === true),
    );
  }
  // 2. Query with isSuper=false to get regular administrators
  const regularAdmins = await api.functional.ecommercePlatform.admins.index(
    adminConnection,
    {
      body: {
        isSuper: false,
      } satisfies IEcommercePlatformAdmin.IRequest,
    },
  );
  typia.assert(regularAdmins);
  // Validate all returned regular admins have is_super=false
  if (regularAdmins.data.length > 0) {
    TestValidator.predicate(
      "all results have is_super=false when filtering by isSuper=false",
      regularAdmins.data.every((admin) => admin.is_super === false),
    );
  }
  // 3. Test pagination with filtered results
  // Query super admins with page=1 and limit=2
  const paginatedSuperAdmins =
    await api.functional.ecommercePlatform.admins.index(adminConnection, {
      body: {
        isSuper: true,
        page: 1,
        limit: 2,
      } satisfies IEcommercePlatformAdmin.IRequest,
    });
  typia.assert(paginatedSuperAdmins);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginatedSuperAdmins.pagination.current,
    1,
  );
  TestValidator.equals("limit is 2", paginatedSuperAdmins.pagination.limit, 2);
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedSuperAdmins.data.length <= 2,
  );
  // If there are multiple pages, query page 2 to verify pagination works
  if (paginatedSuperAdmins.pagination.pages > 1) {
    const secondPage = await api.functional.ecommercePlatform.admins.index(
      adminConnection,
      {
        body: {
          isSuper: true,
          page: 2,
          limit: 2,
        } satisfies IEcommercePlatformAdmin.IRequest,
      },
    );
    typia.assert(secondPage);
    // Validate second page metadata
    TestValidator.equals(
      "current page is 2 on second request",
      secondPage.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "second page returns different IDs than first page",
      secondPage.data.map((a) => a.id),
      paginatedSuperAdmins.data.map((a) => a.id),
    );
  }
}
