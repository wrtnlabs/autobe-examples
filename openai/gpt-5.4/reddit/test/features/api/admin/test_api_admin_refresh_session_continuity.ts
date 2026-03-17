import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_session_continuity(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const initialAuthorized = typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: initialAuthorized.token.refresh,
    } satisfies ICommunityPlatformAdmin.IRefresh,
  });
  const refreshedAuthorized = typia.assert(refreshed);
  TestValidator.equals(
    "same administrator id",
    refreshedAuthorized.id,
    initialAuthorized.id,
  );
  TestValidator.equals(
    "same administrator email",
    refreshedAuthorized.email,
    initialAuthorized.email,
  );
  TestValidator.equals(
    "same administrator status",
    refreshedAuthorized.status,
    initialAuthorized.status,
  );
  TestValidator.equals(
    "same email verification timestamp",
    refreshedAuthorized.email_verified_at,
    initialAuthorized.email_verified_at,
  );
  TestValidator.equals(
    "same last signed-in timestamp",
    refreshedAuthorized.last_signed_in_at,
    initialAuthorized.last_signed_in_at,
  );
  TestValidator.equals(
    "same created timestamp",
    refreshedAuthorized.created_at,
    initialAuthorized.created_at,
  );
  TestValidator.equals(
    "same deletion timestamp",
    refreshedAuthorized.deleted_at,
    initialAuthorized.deleted_at,
  );
  TestValidator.notEquals(
    "refreshed access token should be renewed",
    refreshedAuthorized.token.access,
    initialAuthorized.token.access,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshedAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access expiration should be non-empty",
    refreshedAuthorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable-until should be non-empty",
    refreshedAuthorized.token.refreshable_until.length > 0,
  );
  TestValidator.equals(
    "refresh connection authorization updated",
    refreshConnection.headers?.Authorization,
    refreshedAuthorized.token.access,
  );
}
