import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const createConnection: api.IConnection = { host: connection.host };
  const joinBody: IEconomicPoliticalDiscussionBoardAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin;
  await authorize_admin_join(createConnection, {
    body: joinBody,
  });
  // 2. Login with the created admin account
  const loginConnection: api.IConnection = { host: connection.host };
  const output = await authorize_admin_login(loginConnection, {
    body: {
      email: joinBody.email,
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.ILogin,
  });
  // 3. Validate response
  typia.assert(output);
  TestValidator.equals("User role is admin", output.role, "admin");
  TestValidator.equals("Access token exists", output.access.length > 0, true);
  TestValidator.equals("Refresh token exists", output.refresh.length > 0, true);
}
