import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member token refresh success path with complete authentication workflow.
 *
 * Validates the complete token refresh flow including member registration, initial token issuance, refresh token exchange, and new token validation. Ensures that the refresh endpoint correctly validates the refresh token and issues a new pair of access and refresh tokens with extended expiration times.
 *
 * Special attention is given to verifying that the new tokens are different from the original tokens, member information remains consistent across both authentication responses, and the token structure contains all required fields (access, refresh, expired_at, refreshable_until).
 *
 * 1. Member registers with unique email and password credentials.
 * 2. Captures initial authentication tokens (access and refresh) from join response.
 * 3. Submits refresh token to refresh endpoint to obtain new token pair.
 * 4. Validates new response contains all required token fields and member information.
 * 5. Verifies new tokens are different from original tokens.
 * 6. Verifies member information (id, email, status) remains consistent.
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration credentials with unique email
  const inputEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const inputPassword: string = RandomGenerator.alphaNumeric(16);
  // 2. Member registration to obtain initial authentication tokens
  const joinResult: IShoppingMallMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: inputEmail,
        password: inputPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(joinResult);
  // 3. Capture original tokens for comparison
  const originalAccessToken: string = joinResult.token.access;
  const originalRefreshToken: string = joinResult.token.refresh;
  const originalExpiredAt: string = joinResult.token.expired_at;
  const originalRefreshableUntil: string = joinResult.token.refreshable_until;
  // 4. Verify join response structure
  TestValidator.equals("member id exists", typeof joinResult.id, "string");
  TestValidator.equals(
    "member email matches input",
    joinResult.email,
    inputEmail,
  );
  TestValidator.equals("member status is active", joinResult.status, "active");
  TestValidator.predicate(
    "access token is non-empty",
    originalAccessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    originalRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in future",
    new Date(originalExpiredAt) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(originalRefreshableUntil) > new Date(),
  );
  // 5. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 6. Submit refresh token to obtain new token pair
  const refreshResult: IShoppingMallMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IShoppingMallMember.IRefresh,
    });
  typia.assert(refreshResult);
  // 7. Capture new tokens
  const newAccessToken: string = refreshResult.token.access;
  const newRefreshToken: string = refreshResult.token.refresh;
  const newExpiredAt: string = refreshResult.token.expired_at;
  const newRefreshableUntil: string = refreshResult.token.refreshable_until;
  // 8. Verify refresh response structure
  TestValidator.equals(
    "refresh member id exists",
    typeof refreshResult.id,
    "string",
  );
  TestValidator.predicate(
    "new access token is non-empty",
    newAccessToken.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    newRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "new expired_at is in future",
    new Date(newExpiredAt) > new Date(),
  );
  TestValidator.predicate(
    "new refreshable_until is in future",
    new Date(newRefreshableUntil) > new Date(),
  );
  // 9. Verify member information consistency
  TestValidator.equals("member id unchanged", joinResult.id, refreshResult.id);
  TestValidator.equals(
    "member email unchanged",
    joinResult.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "member status unchanged",
    joinResult.status,
    refreshResult.status,
  );
  // 10. Verify new tokens are different from original tokens
  TestValidator.notEquals(
    "access token changed",
    originalAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token changed",
    originalRefreshToken,
    newRefreshToken,
  );
  // 11. Verify token expiration times are extended
  TestValidator.predicate(
    "new expired_at is later",
    new Date(newExpiredAt) >= new Date(originalExpiredAt),
  );
  TestValidator.predicate(
    "new refreshable_until is later",
    new Date(newRefreshableUntil) >= new Date(originalRefreshableUntil),
  );
  // 12. Verify profile information consistency
  TestValidator.equals(
    "profile null status consistent",
    joinResult.profile === null,
    refreshResult.profile === null,
  );
  TestValidator.equals(
    "administrator null status consistent",
    joinResult.administrator === null,
    refreshResult.administrator === null,
  );
}
