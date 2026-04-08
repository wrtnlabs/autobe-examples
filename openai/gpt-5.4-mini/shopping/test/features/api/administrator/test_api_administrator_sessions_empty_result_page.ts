import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sessions_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
    sort: "-created_at",
    search: RandomGenerator.alphabets(32),
    ip: "255.255.255.255",
    href: "/no/matching/session/path",
    referrer: "/no/matching/referrer",
    createdAtFrom: "2099-01-01T00:00:00.000Z",
    createdAtTo: "2099-01-02T00:00:00.000Z",
    expiredAtFrom: "2099-01-01T00:00:00.000Z",
    expiredAtTo: "2099-01-02T00:00:00.000Z",
  } satisfies IMallPlatformCustomerSession.IRequest;
  const output = await api.functional.mallPlatform.administrator.sessions.index(
    administratorConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals("empty result records", output.pagination.records, 0);
  TestValidator.equals("empty result pages", output.pagination.pages, 0);
  TestValidator.equals(
    "current page preserved",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit preserved",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.equals("empty data array", output.data.length, 0);
}
