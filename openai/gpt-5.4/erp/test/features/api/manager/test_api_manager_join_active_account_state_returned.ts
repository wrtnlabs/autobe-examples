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

export async function test_api_manager_join_active_account_state_returned(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const requestedAt = new Date();
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined manager email matches request",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "joined manager remains active",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    authorized.token.refresh.length > 0,
  );
  const createdAt = new Date(authorized.created_at);
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "created_at is on or after request time",
    createdAt.getTime() >= requestedAt.getTime(),
  );
  TestValidator.predicate(
    "access token expiry is on or after account creation",
    expiredAt.getTime() >= createdAt.getTime(),
  );
  TestValidator.predicate(
    "refresh deadline is on or after access token expiry",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
}
