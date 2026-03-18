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

export async function test_api_manager_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const firstPassword = typia.random<string & tags.Format<"password">>();
  const secondPassword = typia.random<string & tags.Format<"password">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstBody = {
    email,
    password: firstPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const firstJoin: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(firstConnection, {
      body: firstBody,
    });
  typia.assert(firstJoin);
  TestValidator.equals(
    "first join email matches input",
    firstJoin.email,
    email,
  );
  TestValidator.equals(
    "first join account is active",
    firstJoin.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "first join access token exists",
    firstJoin.token.access,
    "",
  );
  TestValidator.notEquals(
    "first join refresh token exists",
    firstJoin.token.refresh,
    "",
  );
  const originalId = firstJoin.id;
  const originalAccessToken = firstJoin.token.access;
  const originalRefreshToken = firstJoin.token.refresh;
  const duplicateConnection: api.IConnection = { host: connection.host };
  const duplicateBody = {
    email,
    password: secondPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  await TestValidator.error("duplicate manager email is rejected", async () => {
    await authorize_manager_join(duplicateConnection, {
      body: duplicateBody,
    });
  });
  TestValidator.equals(
    "original manager id remains unchanged",
    firstJoin.id,
    originalId,
  );
  TestValidator.equals(
    "original access token remains unchanged",
    firstJoin.token.access,
    originalAccessToken,
  );
  TestValidator.equals(
    "original refresh token remains unchanged",
    firstJoin.token.refresh,
    originalRefreshToken,
  );
  TestValidator.equals(
    "original email remains unchanged",
    firstJoin.email,
    email,
  );
  TestValidator.equals(
    "original account remains active",
    firstJoin.deleted_at,
    null,
  );
}
