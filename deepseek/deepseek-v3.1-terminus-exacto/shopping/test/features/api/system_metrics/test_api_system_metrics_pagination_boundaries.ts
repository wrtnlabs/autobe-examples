import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_metrics_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator authentication using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test minimum page value (page=1)
  const firstPage =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("page 1 current page", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "page 1 valid limit",
    firstPage.pagination.limit === 10,
  );
  // Test maximum limit value (limit=100)
  const maxLimitPage =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit value", maxLimitPage.pagination.limit, 100);
  // Test minimum limit value (limit=1)
  const minLimitPage =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals("min limit value", minLimitPage.pagination.limit, 1);
  // Test boundary conditions - request page beyond available pages
  if (firstPage.pagination.pages > 0) {
    const lastPageNumber = firstPage.pagination.pages;
    const boundaryPage =
      await api.functional.ecommerce.administrator.system_metrics.index(
        adminConnection,
        {
          body: {
            page: lastPageNumber satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number,
            limit: 10 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies IEcommerceSystemMetric.IRequest,
        },
      );
    typia.assert(boundaryPage);
    TestValidator.equals(
      "last page current",
      boundaryPage.pagination.current,
      lastPageNumber,
    );
    TestValidator.predicate(
      "last page valid",
      boundaryPage.pagination.current <= firstPage.pagination.pages,
    );
  }
  // Test consistent pagination metadata
  const secondPage =
    await api.functional.ecommerce.administrator.system_metrics.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceSystemMetric.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate pagination consistency across pages
  TestValidator.equals(
    "consistent total records",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "consistent total pages",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
}
