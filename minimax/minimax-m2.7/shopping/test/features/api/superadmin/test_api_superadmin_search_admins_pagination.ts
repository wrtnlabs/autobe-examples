import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_search_admins_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // Create first admin with unique email and name
  const admin1Email = `search_admin_one_${RandomGenerator.alphabets(6)}@test.com`;
  const admin1Name = `SearchAdminOne_${RandomGenerator.alphabets(4)}`;
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_super_admin_join(admin1Connection, {
    body: {
      email: admin1Email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // Create second admin with different unique email and name
  const admin2Email = `search_admin_two_${RandomGenerator.alphabets(6)}@test.com`;
  const admin2Name = `SearchAdminTwo_${RandomGenerator.alphabets(4)}`;
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_super_admin_join(admin2Connection, {
    body: {
      email: admin2Email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // Test 1: Search by partial email match using ILIKE pattern
  const emailSearchTerm = "search_admin_one";
  const emailSearchResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          email: emailSearchTerm,
          status: "active",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  // Verify search results contain only admins whose email contains the search term
  TestValidator.predicate(
    "email search should find admin1",
    emailSearchResult.data.some((admin) =>
      admin.email.toLowerCase().includes(emailSearchTerm.toLowerCase()),
    ),
  );
  // Test 2: Search by partial name match using ILIKE pattern
  const nameSearchTerm = "SearchAdminOne";
  const nameSearchResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          name: nameSearchTerm,
          status: "active",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(nameSearchResult);
  // Verify search results contain only admins whose name contains the search term
  TestValidator.predicate(
    "name search should find matching admins",
    nameSearchResult.data.some((admin) =>
      admin.name.toLowerCase().includes(nameSearchTerm.toLowerCase()),
    ),
  );
  // Test 3: Search with general search parameter (searches both email and name)
  const generalSearchTerm = "search_admin_two";
  const generalSearchResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: generalSearchTerm,
          status: "active",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(generalSearchResult);
  // Verify results match the search term in either email or name
  for (const admin of generalSearchResult.data) {
    const matchesEmail = admin.email
      .toLowerCase()
      .includes(generalSearchTerm.toLowerCase());
    const matchesName = admin.name
      .toLowerCase()
      .includes(generalSearchTerm.toLowerCase());
    TestValidator.predicate(
      "general search should match email or name",
      matchesEmail || matchesName,
    );
  }
  // Test 4: Pagination with limit=1
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination returns only one record per page
  TestValidator.predicate(
    "pagination limit=1 returns at most 1 record",
    paginatedResult.data.length <= 1,
  );
  // Verify pagination metadata is correct
  TestValidator.equals(
    "current page should be 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 1",
    paginatedResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "records count should be positive",
    paginatedResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count should be positive",
    paginatedResult.pagination.pages > 0,
  );
  // Test 5: Pagination page 2 with limit=1
  const page2Result =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          page: 2,
          limit: 1,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(page2Result);
  // Verify page 2 pagination metadata
  TestValidator.equals(
    "page 2 current should be 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 1",
    page2Result.pagination.limit,
    1,
  );
  // Verify different records on page 2 (if available)
  if (paginatedResult.data.length > 0 && page2Result.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 should have different records",
      paginatedResult.data[0].id,
      page2Result.data[0].id,
    );
  }
}
