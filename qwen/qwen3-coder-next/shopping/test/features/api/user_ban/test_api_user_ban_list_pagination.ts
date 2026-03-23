import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_user_ban_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminInfo = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminInfo);
  // 2. Test offset-based pagination with skip=0, take=10
  const page1 = await api.functional.ecommerceMall.admin.user_bans.index(
    adminConnection,
    {
      body: {
        skip: 0,
        take: 10,
      } satisfies IEcommerceMallUserBan.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 should have exactly 10 records",
    page1.data.length,
    10,
  );
  // 3. Test offset-based pagination with skip=10, take=10
  const page2 = await api.functional.ecommerceMall.admin.user_bans.index(
    adminConnection,
    {
      body: {
        skip: 10,
        take: 10,
      } satisfies IEcommerceMallUserBan.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 should have exactly 10 records",
    page2.data.length,
    10,
  );
  // 4. Verify cursor-based pagination
  const lastItemFromPage1 =
    page1.data.length > 0 ? page1.data[page1.data.length - 1].id : null;
  if (lastItemFromPage1) {
    const cursorPage = await api.functional.ecommerceMall.admin.user_bans.index(
      adminConnection,
      {
        body: {
          cursor: lastItemFromPage1,
          take: 10,
        } satisfies IEcommerceMallUserBan.IRequest,
      },
    );
    typia.assert(cursorPage);
    TestValidator.predicate(
      "cursor page should have records",
      cursorPage.data.length > 0,
    );
  }
  // 5. Verify end of pagination
  const finalPage = await api.functional.ecommerceMall.admin.user_bans.index(
    adminConnection,
    {
      body: {
        skip: 110,
        take: 10,
      } satisfies IEcommerceMallUserBan.IRequest,
    },
  );
  typia.assert(finalPage);
  // Verify final page has 5 or fewer records (remaining from 115 total)
  TestValidator.predicate(
    "final page should have remaining records (5 or less)",
    finalPage.data.length <= 5,
  );
  // 6. Verify pagination metadata
  TestValidator.equals(
    "pagination shows correct total records",
    page1.pagination.records,
    115,
  );
  TestValidator.equals(
    "pagination shows correct page count",
    page1.pagination.pages,
    12,
  );
}
