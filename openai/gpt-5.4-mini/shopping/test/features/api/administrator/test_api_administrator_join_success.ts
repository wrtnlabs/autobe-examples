import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const response = await authorize_administrator_join(administratorConnection, {
    body: {
      email,
      password: "StrongP@ssw0rd123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(response);
  TestValidator.equals(
    "administrator email should match request",
    response.email,
    email,
  );
  TestValidator.predicate(
    "administrator id should be present",
    response.id.length > 0,
  );
  TestValidator.predicate(
    "administrator grade should be present",
    response.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator status should be present",
    response.status.length > 0,
  );
  TestValidator.predicate(
    "administrator createdAt should be present",
    response.createdAt.length > 0,
  );
  TestValidator.predicate(
    "administrator updatedAt should be present",
    response.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "administrator token access should be issued",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "administrator token refresh should be issued",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "administrator token expiry should be present",
    response.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "administrator refresh deadline should be present",
    response.token.refreshable_until.length > 0,
  );
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: response.token.access,
    },
  };
  TestValidator.predicate(
    "administrator connection should be usable immediately after join",
    authenticatedAdminConnection.headers?.Authorization ===
      response.token.access,
  );
}
