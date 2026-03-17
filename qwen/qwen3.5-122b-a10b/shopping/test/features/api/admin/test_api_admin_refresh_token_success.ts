import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: typia.assert<IEcommerceMallAdmin.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      }),
    });
  typia.assert(initialAuth);
  TestValidator.predicate(
    "initial access token exists",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      initialAuth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "initial refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      initialAuth.token.refreshable_until,
    ),
  );
  const refreshedAuth: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_refresh(adminConnection, {
      body: {
        refresh_token: initialAuth.token.refresh,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "new expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshedAuth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "new refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshedAuth.token.refreshable_until,
    ),
  );
  TestValidator.equals("admin id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "admin email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "admin grade matches",
    refreshedAuth.admin_grade,
    initialAuth.admin_grade,
  );
  TestValidator.equals(
    "account status matches",
    refreshedAuth.account_status,
    initialAuth.account_status,
  );
  TestValidator.notEquals(
    "access token changed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  const secondRefreshedAuth: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_refresh(adminConnection, {
      body: {
        refresh_token: refreshedAuth.token.refresh,
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  typia.assert(secondRefreshedAuth);
  TestValidator.equals(
    "second refresh - admin id matches",
    secondRefreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "second refresh - admin email matches",
    secondRefreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.predicate(
    "second refresh - new access token issued",
    secondRefreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh - new refresh token issued",
    secondRefreshedAuth.token.refresh.length > 0,
  );
}