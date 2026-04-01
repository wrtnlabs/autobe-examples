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

export async function test_api_administrator_account_listing(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const defaultResponse =
    await api.functional.mallPlatform.administrator.administrators.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page current",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page limit",
    defaultResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "default pagination records are non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination pages are non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default page data does not exceed limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  TestValidator.predicate(
    "default page has valid records/pages relationship",
    defaultResponse.pagination.records === 0
      ? defaultResponse.pagination.pages === 0
      : defaultResponse.pagination.pages >= 1,
  );
  for (const summary of defaultResponse.data) {
    typia.assert(summary);
    TestValidator.equals(
      "summary exposes only id,email,grade,status,createdAt,updatedAt,deletedAt",
      Object.keys(summary).sort(),
      ["createdAt", "deletedAt", "email", "grade", "id", "status", "updatedAt"],
    );
  }
  const filterSeed = RandomGenerator.alphaNumeric(12).toLowerCase();
  const filteredResponse =
    await api.functional.mallPlatform.administrator.administrators.index(
      administratorConnection,
      {
        body: {
          search: filterSeed,
          grade: "regular",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered page current",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered page limit",
    filteredResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered data does not exceed limit",
    filteredResponse.data.length <= filteredResponse.pagination.limit,
  );
  for (const summary of filteredResponse.data) {
    TestValidator.predicate(
      "filtered email matches search when returned",
      summary.email.toLowerCase().includes(filterSeed),
    );
    TestValidator.equals("filtered grade matches", summary.grade, "regular");
    TestValidator.equals("filtered status matches", summary.status, "active");
    TestValidator.equals(
      "filtered summary exposes only summary fields",
      Object.keys(summary).sort(),
      ["createdAt", "deletedAt", "email", "grade", "id", "status", "updatedAt"],
    );
  }
  const noMatchResponse =
    await api.functional.mallPlatform.administrator.administrators.index(
      administratorConnection,
      {
        body: {
          search: `no-match-${RandomGenerator.alphaNumeric(24)}`,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match page current",
    noMatchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "no match page limit",
    noMatchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "no match records",
    noMatchResponse.pagination.records,
    0,
  );
  TestValidator.equals("no match pages", noMatchResponse.pagination.pages, 0);
  TestValidator.equals("no match data length", noMatchResponse.data.length, 0);
}
