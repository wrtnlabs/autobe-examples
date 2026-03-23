import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account via join
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  // 2. Login with the same credentials
  const loginInput: IRedditLikeAdmin.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
  };
  const loggedin = await authorize_admin_login(adminConnection, {
    body: loginInput,
  });
  typia.assert(loggedin);
  // 3. Validate response structure
  TestValidator.equals("admin ID is UUID", typeof joined.id, "string");
  TestValidator.predicate("ID matches", joined.id === loggedin.id);
  TestValidator.equals(
    "token.access exists",
    typeof loggedin.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh exists",
    typeof loggedin.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at format",
    typeof loggedin.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until format",
    typeof loggedin.token.refreshable_until,
    "string",
  );
}
