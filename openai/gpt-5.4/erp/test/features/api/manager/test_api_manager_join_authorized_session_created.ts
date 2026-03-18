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

export async function test_api_manager_join_authorized_session_created(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
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
    "joined manager email matches input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "newly joined manager is active",
    authorized.deleted_at,
    null,
  );
  TestValidator.equals(
    "connection authorization header matches returned access token",
    managerConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.predicate(
    "access token is issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is issued",
    authorized.token.refresh.length > 0,
  );
  const createdAt = new Date(authorized.created_at).getTime();
  const updatedAt = new Date(authorized.updated_at).getTime();
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedAt >= createdAt,
  );
  TestValidator.predicate(
    "refreshable_until is not earlier than expired_at",
    refreshableUntil >= expiredAt,
  );
}
