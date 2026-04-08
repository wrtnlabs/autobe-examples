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

/**
 * Test that refreshing with a malformed or tampered refresh token is rejected.
 *
 * Validates that the admin token refresh endpoint properly rejects invalid refresh
 * tokens. This includes tampered tokens with modified characters, tokens with
 * appended text, and completely fake tokens that do not match any stored session.
 *
 * The refresh token should be validated against stored sessions in the database.
 * Any tampering, corruption, or fabrication of the token must result in
 * authentication rejection with 401 or 403 status code.
 *
 * 1. Register a new administrator account via join to establish valid session context.
 * 2. Capture the valid refresh token from the authorization response.
 * 3. Create multiple invalid token variants: modified characters, appended text, and fake token.
 * 4. Attempt to refresh with each invalid token.
 * 5. Verify the request is rejected with appropriate HTTP error status for each case.
 */
export async function test_api_admin_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to get valid refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  const validRefreshToken = authorized.token.refresh;
  // 2. Test with completely fake token (no relationship to any valid token)
  const fakeToken = `fake.token.${RandomGenerator.alphaNumeric(32)}`;
  // 3. Test with tampered token (valid token with modified characters)
  const tamperedToken = validRefreshToken.slice(0, -5) + "XXXXX";
  // 4. Test with appended text (valid token with extra characters)
  const appendedToken = validRefreshToken + "_malformed";
  // 5. Verify each invalid token is rejected
  await TestValidator.httpError(
    "fake token should be rejected",
    [401, 403],
    async () =>
      await api.functional.ecommerceMall.auth.admin.refresh(connection, {
        body: { refresh: fakeToken } satisfies IEcommerceMallAdmin.IRefresh,
      }),
  );
  await TestValidator.httpError(
    "tampered token should be rejected",
    [401, 403],
    async () =>
      await api.functional.ecommerceMall.auth.admin.refresh(connection, {
        body: { refresh: tamperedToken } satisfies IEcommerceMallAdmin.IRefresh,
      }),
  );
  await TestValidator.httpError(
    "appended token should be rejected",
    [401, 403],
    async () =>
      await api.functional.ecommerceMall.auth.admin.refresh(connection, {
        body: { refresh: appendedToken } satisfies IEcommerceMallAdmin.IRefresh,
      }),
  );
}
