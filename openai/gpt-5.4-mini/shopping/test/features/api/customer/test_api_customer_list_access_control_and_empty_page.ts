import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_list_access_control_and_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page data matches pagination bounds",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const emptyPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1000000,
          limit: 10,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
  TestValidator.predicate(
    "empty page pagination remains non-negative",
    emptyPage.pagination.current >= 0 &&
      emptyPage.pagination.limit >= 0 &&
      emptyPage.pagination.records >= 0 &&
      emptyPage.pagination.pages >= 0,
  );
}
