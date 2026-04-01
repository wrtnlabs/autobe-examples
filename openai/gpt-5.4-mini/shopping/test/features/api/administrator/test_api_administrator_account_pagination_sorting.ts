import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_account_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const page1 =
    await api.functional.mallPlatform.administrator.administrators.index(
      adminConnection,
      {
        body: {
          sort: "+email",
          page: 1,
          limit: 2,
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(page1);
  page1.data.forEach((item) => typia.assert(item));
  const page2 =
    await api.functional.mallPlatform.administrator.administrators.index(
      adminConnection,
      {
        body: {
          sort: "+email",
          page: 2,
          limit: 2,
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(page2);
  page2.data.forEach((item) => typia.assert(item));
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "total records stable",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "total pages stable",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.predicate(
    "page 1 records are within requested limit",
    page1.data.length <= page1.pagination.limit,
  );
  TestValidator.predicate(
    "page 2 records are within requested limit",
    page2.data.length <= page2.pagination.limit,
  );
  TestValidator.predicate(
    "page navigation does not overlap",
    page1.data.every((left) =>
      page2.data.every((right) => left.id !== right.id),
    ),
  );
  TestValidator.predicate(
    "stable ordering across pages",
    page1.data.every(
      (item, index, array) =>
        index === 0 || array[index - 1]!.email <= item.email,
    ) &&
      page2.data.every(
        (item, index, array) =>
          index === 0 || array[index - 1]!.email <= item.email,
      ),
  );
}
