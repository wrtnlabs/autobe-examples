import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join admin to create account and get initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(initialAuth);
  // 2. Refresh with the initial refresh token
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(adminRefreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    },
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation - refresh token must be different
  TestValidator.notEquals(
    "refresh token rotation",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 4. Validate access token is different
  TestValidator.notEquals(
    "access token rotation",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // 5. Validate expiration timestamps are updated
  TestValidator.predicate(
    "access token expiration updated",
    new Date(refreshedAuth.token.expired_at).getTime() >
      new Date(initialAuth.token.expired_at).getTime(),
  );
  // 6. Validate refreshable_until is present and valid
  TestValidator.predicate(
    "refreshable_until exists",
    refreshedAuth.token.refreshable_until !== undefined,
  );
  // 7. Validate IAuthorized response fields
  TestValidator.predicate(
    "admin id present",
    refreshedAuth.id !== undefined && refreshedAuth.id !== null,
  );
  TestValidator.predicate(
    "admin email present",
    refreshedAuth.email !== undefined && refreshedAuth.email !== null,
  );
  TestValidator.equals("admin is_active", refreshedAuth.is_active, true);
  TestValidator.predicate(
    "created_at format valid",
    refreshedAuth.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at format valid",
    refreshedAuth.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at nullable",
    refreshedAuth.deleted_at === null || refreshedAuth.deleted_at !== undefined,
  );
}
