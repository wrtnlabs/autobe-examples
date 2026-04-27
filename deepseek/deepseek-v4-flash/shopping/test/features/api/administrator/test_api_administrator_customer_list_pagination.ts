import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customer_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. List customers page 1 with default sorting (newest first)
  const page1 =
    await api.functional.eCommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "total records >= returned data count",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pages computed correctly from records and limit",
    page1.pagination.pages ===
      (page1.pagination.records === 0
        ? 0
        : Math.ceil(page1.pagination.records / page1.pagination.limit)),
  );
  // 4. Validate sorting: newest first (created_at DESC)
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `customer[${i - 1}] is newer than or equal to customer[${i}]`,
        page1.data[i - 1].created_at >= page1.data[i].created_at,
      );
    }
  }
}
