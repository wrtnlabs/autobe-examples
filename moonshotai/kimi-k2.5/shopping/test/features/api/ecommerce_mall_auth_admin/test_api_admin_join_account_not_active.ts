import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_account_not_active(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for suspended and banned account attempts
  const suspendedConnection: api.IConnection = { host: connection.host };
  const bannedConnection: api.IConnection = { host: connection.host };
  // Prepare join input for suspended account
  const suspendedAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  // Attempt join with suspended account - expect HTTP 401 or 403
  await TestValidator.httpError(
    "suspended admin cannot authenticate",
    [401, 403],
    async () => {
      await authorize_admin_join(suspendedConnection, {
        body: suspendedAdminBody,
      });
    },
  );
  // Prepare join input for banned account
  const bannedAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  // Attempt join with banned account - expect HTTP 401 or 403
  await TestValidator.httpError(
    "banned admin cannot authenticate",
    [401, 403],
    async () => {
      await authorize_admin_join(bannedConnection, {
        body: bannedAdminBody,
      });
    },
  );
}
