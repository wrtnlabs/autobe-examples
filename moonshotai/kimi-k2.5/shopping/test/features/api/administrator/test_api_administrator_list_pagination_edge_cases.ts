import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_list_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create additional administrators for pagination testing
  await ArrayUtil.asyncRepeat(3, async () => {
    const newAdminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(newAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"url">>(),
        referrer: typia.random<string & tags.Format<"url">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  });
  // Test pagination with limit=1 to force multiple pages
  const page1 = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        limit: 1,
        cursor: null,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit matches", page1.pagination.limit, 1);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 data length", page1.data.length, 1);
  TestValidator.predicate("page 1 has more pages", page1.pagination.pages > 1);
  // Request second page using cursor token (last item ID)
  const lastItemId = page1.data[0]?.id;
  const page2 = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        limit: 1,
        cursor: lastItemId,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 current increments",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 data length", page2.data.length, 1);
  TestValidator.notEquals(
    "page 2 different item from page 1",
    page2.data[0]?.id,
    lastItemId,
  );
  // Test limit=100 (maximum)
  const largePage = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        limit: 100,
        cursor: null,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(largePage);
  TestValidator.equals(
    "large page limit is 100",
    largePage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large page data length <= 100",
    largePage.data.length <= 100,
  );
  // Test filter with non-existent email (empty results)
  const nonExistentEmail = `nonexistent_${RandomGenerator.alphaNumeric(10)}@test.com`;
  const emptyResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        email: nonExistentEmail,
        limit: 20,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  // Verify pagination metadata calculations
  const totalRecords = page1.pagination.records;
  const calculatedPages = Math.ceil(totalRecords / page1.pagination.limit);
  TestValidator.equals(
    "pages calculation matches Math.ceil(records/limit)",
    page1.pagination.pages,
    calculatedPages,
  );
  TestValidator.predicate(
    "current page is 1-indexed",
    page1.pagination.current >= 1,
  );
}
