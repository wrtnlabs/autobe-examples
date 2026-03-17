import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_join_retained_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  const retainedEmail = typia.random<string & tags.Format<"email">>();
  const firstJoinConnection: api.IConnection = { host: connection.host };
  const firstJoinBody = {
    email: retainedEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const firstAuthorized = await authorize_super_administrator_join(
    firstJoinConnection,
    {
      body: firstJoinBody,
    },
  );
  typia.assert(firstAuthorized);
  TestValidator.equals(
    "joined super administrator email matches input",
    firstAuthorized.email,
    firstJoinBody.email,
  );
  const conflictConnection: api.IConnection = { host: connection.host };
  const conflictBody = {
    email: retainedEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  await TestValidator.error(
    "duplicate or retained super administrator email blocks recreation",
    async () => {
      await authorize_super_administrator_join(conflictConnection, {
        body: conflictBody,
      });
    },
  );
}
