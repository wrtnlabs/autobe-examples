import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success_tokens_issued(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  TestValidator.predicate("admin id is non-empty", authorized.id.length > 0);
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.predicate(
    "created_at is present",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    authorized.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  const token = authorized.token;
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is present", token.expired_at.length > 0);
  TestValidator.predicate(
    "refreshable_until is present",
    token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "connection has Authorization header set",
    String(adminJoinConnection.headers?.Authorization ?? "").length > 0,
  );
}
