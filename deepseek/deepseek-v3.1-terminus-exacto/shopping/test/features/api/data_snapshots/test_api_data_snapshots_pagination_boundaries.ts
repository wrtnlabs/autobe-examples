import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDataSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_data_snapshots_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection with authentication
  const superConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test minimum page constraint (page = 1)
  const firstPage =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit should be valid",
    firstPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Test maximum page limit constraint (limit = 100)
  const maxLimitPage =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit should be enforced",
    maxLimitPage.pagination.limit,
    100,
  );
  // Test out-of-bounds page (page beyond total pages)
  const outOfBoundsPage =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(outOfBoundsPage);
  TestValidator.predicate(
    "out-of-bounds page should have empty data",
    outOfBoundsPage.data.length === 0,
  );
  TestValidator.equals(
    "out-of-bounds page number should match request",
    outOfBoundsPage.pagination.current,
    999999,
  );
  // Test minimum limit constraint (limit = 1)
  const minLimitPage =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "minimum limit should be enforced",
    minLimitPage.pagination.limit,
    1,
  );
  // Test pagination consistency
  const totalRecords = firstPage.pagination.records;
  const totalPages = firstPage.pagination.pages;
  if (totalPages > 1) {
    // Test middle page when multiple pages exist
    const middlePage =
      await api.functional.ecommerce.superAdministrator.data_snapshots.index(
        superConnection,
        {
          body: {
            page: Math.floor(totalPages / 2),
            limit: 10,
          } satisfies IEcommerceDataSnapshot.IRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.predicate(
      "middle page should have data",
      middlePage.data.length > 0,
    );
  }
  if (totalPages > 0) {
    // Test last page
    const lastPage =
      await api.functional.ecommerce.superAdministrator.data_snapshots.index(
        superConnection,
        {
          body: {
            page: totalPages,
            limit: 10,
          } satisfies IEcommerceDataSnapshot.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page should match total pages",
      lastPage.pagination.current,
      totalPages,
    );
    TestValidator.predicate(
      "last page should have data",
      lastPage.data.length > 0,
    );
    // Test boundary page calculations
    const expectedPages = Math.ceil(totalRecords / 10);
    TestValidator.equals(
      "page calculation should be accurate",
      totalPages,
      expectedPages,
    );
  }
}
