import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_roster_browse_with_filters(
  connection: api.IConnection,
): Promise<void> {
  const searchToken = `Roster${RandomGenerator.alphabets(8)}`;
  const domain = `${RandomGenerator.alphabets(6)}.com`;
  const firstEmail = `${searchToken}.Alpha@${domain}`;
  const secondEmail = `${searchToken}.Beta@${domain}`;
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_super_administrator_join(
    firstConnection,
    {
      body: {
        email: firstEmail,
        password: typia.random<string & tags.Format<"password">>(),
        href: `https://example.com/${RandomGenerator.alphabets(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(firstAuthorized);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_super_administrator_join(
    secondConnection,
    {
      body: {
        email: secondEmail,
        password: typia.random<string & tags.Format<"password">>(),
        href: `https://example.com/${RandomGenerator.alphabets(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(secondAuthorized);
  const request = {
    search: searchToken.toLowerCase(),
    active: true,
    page: 1,
    limit: 10,
    sort: "email",
  } satisfies IShoppingMallSuperAdministrator.IRequest;
  const page = await api.functional.shoppingMall.superAdministrators.index(
    firstConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "returned row count does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "record count covers current page rows",
    page.pagination.records >= page.data.length,
  );
  TestValidator.equals(
    "pagination pages derived from records and limit",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  const rosterEmails = page.data.map((item) => item.email.toLowerCase());
  const rosterIds = page.data.map((item) => item.id);
  TestValidator.predicate(
    "first created super administrator is present",
    rosterIds.includes(firstAuthorized.id),
  );
  TestValidator.predicate(
    "second created super administrator is present",
    rosterIds.includes(secondAuthorized.id),
  );
  TestValidator.predicate(
    "first created super administrator email is present",
    rosterEmails.includes(firstAuthorized.email.toLowerCase()),
  );
  TestValidator.predicate(
    "second created super administrator email is present",
    rosterEmails.includes(secondAuthorized.email.toLowerCase()),
  );
  for (const item of page.data) {
    TestValidator.predicate(
      "safe summary shape only",
      typia.equals<IShoppingMallSuperAdministrator.ISummary>(item),
    );
    TestValidator.predicate(
      "email matches case-insensitive search token",
      item.email.toLowerCase().includes(searchToken.toLowerCase()),
    );
    TestValidator.equals("active filter applied", item.active, true);
    if (item.id === firstAuthorized.id || item.id === secondAuthorized.id) {
      TestValidator.equals(
        "newly joined super administrators are not deleted",
        item.deleted_at,
        null,
      );
    }
  }
  const sortedEmails = [...rosterEmails].sort((x, y) => x.localeCompare(y));
  TestValidator.equals(
    "email sorting is deterministic ascending",
    rosterEmails,
    sortedEmails,
  );
}
