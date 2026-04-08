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

export async function test_api_administrator_administrators_browse(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await authorize_administrator_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.administrators.index(
      firstConnection,
      {
        body: {
          search: "",
          grade: "",
          status: "",
          page: 1,
          limit: 1,
          sort: "-created_at",
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.administrator.administrators.index(
      firstConnection,
      {
        body: {
          search: "",
          grade: "",
          status: "",
          page: 2,
          limit: 1,
          sort: "-created_at",
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 1);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
  TestValidator.equals(
    "stable total records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "stable total pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "first page contains at most one administrator summary",
    firstPage.data.length <= 1,
  );
  TestValidator.predicate(
    "second page contains at most one administrator summary",
    secondPage.data.length <= 1,
  );
  TestValidator.predicate(
    "administrator summaries expose only public governance fields",
    [...firstPage.data, ...secondPage.data].every((row) => {
      const keys = Object.keys(row).sort();
      const expected = [
        "created_at",
        "deleted_at",
        "email",
        "grade",
        "id",
        "status",
        "updated_at",
      ];
      return JSON.stringify(keys) === JSON.stringify(expected);
    }),
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "pagination should move to a different record on the next page",
      firstPage.data[0].id,
      secondPage.data[0].id,
    );
  }
}
