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

export async function test_api_administrator_customer_list_filter_by_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // List customers filtered by banned: true
  const bannedPage =
    await api.functional.eCommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          banned: true,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(bannedPage);
  for (const customer of bannedPage.data) {
    TestValidator.predicate(
      "banned customer has non-null banned_at",
      customer.banned_at !== null,
    );
  }
  // List customers filtered by banned: false
  const unbannedPage =
    await api.functional.eCommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          banned: false,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCustomer.IRequest,
      },
    );
  typia.assert(unbannedPage);
  for (const customer of unbannedPage.data) {
    TestValidator.predicate(
      "unbanned customer has null banned_at",
      customer.banned_at === null,
    );
  }
  // Verify the record counts differ between the two filtered sets
  TestValidator.notEquals(
    "banned vs unbanned record counts differ",
    bannedPage.pagination.records,
    unbannedPage.pagination.records,
  );
}
