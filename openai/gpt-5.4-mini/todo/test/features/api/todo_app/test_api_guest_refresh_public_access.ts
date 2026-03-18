import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_public_access(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(joinConnection, { body: {} });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest refresh should preserve guest identity",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "guest refresh should keep guest creation timestamp stable",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "guest refresh should keep guest update timestamp stable or compatible",
    refreshed.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "guest refresh should keep deletion state stable",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.predicate(
    "refreshed access token should be issued",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be issued",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access token should be in JWT-like form",
    refreshed.token.access.split(".").length >= 2,
  );
  TestValidator.predicate(
    "refreshed refresh token should be in JWT-like form",
    refreshed.token.refresh.split(".").length >= 2,
  );
  TestValidator.predicate(
    "refreshed access token expiration should be in the future",
    new Date(refreshed.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable until should be in the future",
    new Date(refreshed.token.refreshable_until).getTime() > Date.now(),
  );
}
