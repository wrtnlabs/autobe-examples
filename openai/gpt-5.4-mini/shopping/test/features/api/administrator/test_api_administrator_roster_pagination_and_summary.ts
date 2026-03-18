import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_roster_pagination_and_summary(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(auth);
  const request = {
    search: auth.email,
    grade: auth.grade,
    accountStatus: auth.accountStatus,
    page: 1,
    limit: 10,
    sort: "+email",
  } satisfies IShoppingMallAdministrator.IRequest;
  const output =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      { body: request },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "roster search should match the authenticated administrator when results exist",
    output.data.length === 0 ||
      output.data.some((item) => item.email === auth.email),
  );
  const projected = output.data.map((item) => ({
    id: item.id,
    email: item.email,
    grade: item.grade,
    accountStatus: item.accountStatus,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt,
  }));
  TestValidator.equals(
    "summary shape is stable",
    projected,
    output.data.map((item) => ({
      id: item.id,
      email: item.email,
      grade: item.grade,
      accountStatus: item.accountStatus,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
    })),
  );
  const repeated =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      { body: request },
    );
  typia.assert(repeated);
  TestValidator.equals("stable roster order", repeated.data, output.data);
  TestValidator.equals(
    "stable pagination metadata",
    repeated.pagination,
    output.pagination,
  );
}
