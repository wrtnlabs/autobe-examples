import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin account to obtain initial refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    });
  typia.assert(initialAuth);
  // Step 2: Extract refresh token from initial authentication
  const refreshToken: string = initialAuth.token.refresh;
  // Step 3: Use refresh token to obtain new access token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        token: refreshToken,
      } satisfies IEconomicForumAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);
  // Step 4: Validate that new access token is issued
  TestValidator.notEquals(
    "new access token should be different from original",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // Step 5: Verify refresh token remains unchanged
  TestValidator.equals(
    "refresh token should remain the same after refresh",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // Step 6: Validate expiration timestamps are updated
  // new access token should have later expiration than original
  TestValidator.predicate(
    "new access token should have later expiration",
    new Date(refreshedAuth.token.expired_at).getTime() >
      new Date(initialAuth.token.expired_at).getTime(),
  );
  // Step 7: Verify refreshable_until remains same (since refresh token unchanged)
  TestValidator.equals(
    "refreshable_until should remain unchanged",
    initialAuth.token.refreshable_until,
    refreshedAuth.token.refreshable_until,
  );
  // Step 8: Validate IAdmin.IAuthorized structure
  TestValidator.equals(
    "admin id should match",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "admin email should match",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "admin name should match",
    initialAuth.name,
    refreshedAuth.name,
  );
  TestValidator.equals(
    "admin role should match",
    initialAuth.role,
    refreshedAuth.role,
  );
  TestValidator.equals(
    "admin status should match",
    initialAuth.status,
    refreshedAuth.status,
  );
  // Updated at should be newer after refresh
  TestValidator.predicate(
    "updated_at should be newer after refresh",
    new Date(refreshedAuth.updatedAt).getTime() >
      new Date(initialAuth.updatedAt).getTime(),
  );
  // createdAt should remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    initialAuth.createdAt,
    refreshedAuth.createdAt,
  );
}
