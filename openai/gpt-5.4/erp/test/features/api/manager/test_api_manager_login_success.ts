import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_manager_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_manager_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert<IHrmTimeTrackingManager.IAuthorized>(joined);
  TestValidator.equals("join email matches", joined.email, email);
  TestValidator.equals("new manager is active", joined.deleted_at, null);
  TestValidator.predicate(
    "join access token exists",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join refresh token exists",
    joined.token.refresh.length > 0,
  );
  TestValidator.equals(
    "join connection authorization header updated",
    joinConnection.headers?.Authorization,
    joined.token.access,
  );
  typia.assertEquals<IHrmTimeTrackingManager.IAuthorized>({
    id: joined.id,
    email: joined.email,
    created_at: joined.created_at,
    updated_at: joined.updated_at,
    deleted_at: joined.deleted_at,
    token: {
      access: joined.token.access,
      refresh: joined.token.refresh,
      expired_at: joined.token.expired_at,
      refreshable_until: joined.token.refreshable_until,
    },
  });
  const loginBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IHrmTimeTrackingManager.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_manager_login(loginConnection, {
    body: loginBody,
  });
  typia.assert<IHrmTimeTrackingManager.IAuthorized>(loggedIn);
  TestValidator.equals(
    "login manager id matches joined manager",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals("login email matches", loggedIn.email, email);
  TestValidator.equals(
    "login account remains active",
    loggedIn.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "login creates a new access token",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "login creates a new refresh token",
    loggedIn.token.refresh,
    joined.token.refresh,
  );
  TestValidator.equals(
    "login connection authorization header updated",
    loginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
  typia.assertEquals<IHrmTimeTrackingManager.IAuthorized>({
    id: loggedIn.id,
    email: loggedIn.email,
    created_at: loggedIn.created_at,
    updated_at: loggedIn.updated_at,
    deleted_at: loggedIn.deleted_at,
    token: {
      access: loggedIn.token.access,
      refresh: loggedIn.token.refresh,
      expired_at: loggedIn.token.expired_at,
      refreshable_until: loggedIn.token.refreshable_until,
    },
  });
}
