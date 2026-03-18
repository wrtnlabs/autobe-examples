import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdministrator.IJoin;
  const output = await authorize_administrator_join(adminConnection, {
    body,
  });
  typia.assert(output);
  TestValidator.equals("administrator email", output.email, body.email);
  TestValidator.predicate("administrator id exists", output.id.length > 0);
  TestValidator.predicate(
    "administrator grade exists",
    output.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator account status exists",
    output.accountStatus.length > 0,
  );
  TestValidator.equals("deletedAt is null", output.deletedAt, null);
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expiration exists",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh expiration exists",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "authorization header is initialized for subsequent administrator actions",
    typeof adminConnection.headers?.Authorization === "string" &&
      adminConnection.headers.Authorization.length > 0,
  );
}
