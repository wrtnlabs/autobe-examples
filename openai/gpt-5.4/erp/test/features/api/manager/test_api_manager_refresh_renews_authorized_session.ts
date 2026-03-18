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

export async function test_api_manager_refresh_renews_authorized_session(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const joined = await authorize_manager_join(managerConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshInput = {
    refresh: joined.token.refresh,
  } satisfies IHrmTimeTrackingManager.IRefresh;
  const refreshed = await authorize_manager_refresh(refreshConnection, {
    body: refreshInput,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "same manager id after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "same manager email after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "manager remains active after refresh",
    refreshed.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "refreshed access token is renewed",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refreshed token bundle is renewed",
    refreshed.token,
    joined.token,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
}
