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

export async function test_api_administrator_join_session_initialization(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const output = await authorize_administrator_join(administratorConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(output);
  TestValidator.equals("administrator email", output.email, email);
  TestValidator.predicate(
    "administrator id is uuid-like",
    output.id.length > 0,
  );
  TestValidator.predicate(
    "administrator grade is initialized",
    output.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator account status is initialized",
    output.accountStatus.length > 0,
  );
  TestValidator.predicate(
    "administrator createdAt exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "administrator updatedAt exists",
    output.updatedAt.length > 0,
  );
  TestValidator.equals(
    "administrator deletedAt is null",
    output.deletedAt,
    null,
  );
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
}
