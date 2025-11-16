import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_refresh_new_token_expiration(
  connection: api.IConnection,
) {
  // Step 1: Create admin credentials for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  // Step 2: Admin login to obtain initial tokens with expired_at timestamp
  const loginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(loginResponse);

  // Extract the initial token information
  const initialToken: IAuthorizationToken = loginResponse.token;
  typia.assert(initialToken);

  // Verify initial expired_at timestamp exists and is in valid ISO 8601 format
  TestValidator.predicate(
    "initial token expired_at should be a valid ISO 8601 date-time",
    initialToken.expired_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    ) !== null,
  );

  // Store the initial expiration timestamp
  const initialExpiredAt = new Date(initialToken.expired_at);
  const loginTime = new Date();

  // Record time before refresh operation
  const preRefreshTime = new Date();

  // Step 3: Refresh tokens using the refresh token from login
  const refreshResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: initialToken.refresh,
      } satisfies ITodoAppAdmin.IRefresh,
    });
  typia.assert(refreshResponse);

  // Extract the refreshed token information
  const refreshedToken: IAuthorizationToken = refreshResponse.token;
  typia.assert(refreshedToken);

  // Record time after refresh operation
  const postRefreshTime = new Date();

  // Step 4: Verify the refreshed token has an updated expired_at timestamp
  TestValidator.predicate(
    "refreshed token expired_at should be a valid ISO 8601 date-time",
    refreshedToken.expired_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    ) !== null,
  );

  const refreshedExpiredAt = new Date(refreshedToken.expired_at);

  // Step 5: Verify that the new expiration is later than the original expiration
  TestValidator.predicate(
    "refreshed token expiration should be later than initial token expiration",
    refreshedExpiredAt.getTime() > initialExpiredAt.getTime(),
  );

  // Step 6: Verify that the new expiration is approximately 1-2 hours from refresh time
  const expirationDuration =
    refreshedExpiredAt.getTime() - postRefreshTime.getTime();
  const oneHourMs = 60 * 60 * 1000;
  const twoHoursMs = 2 * 60 * 60 * 1000;

  TestValidator.predicate(
    "refreshed token expiration should be set approximately 1-2 hours from refresh operation",
    expirationDuration >= oneHourMs && expirationDuration <= twoHoursMs,
  );

  // Step 7: Verify that expiration is based on refresh time, not login time
  const expirationFromLoginTime =
    refreshedExpiredAt.getTime() - loginTime.getTime();
  const expirationFromRefreshTime =
    refreshedExpiredAt.getTime() - preRefreshTime.getTime();

  TestValidator.predicate(
    "new token expiration should be calculated from refresh time (much shorter duration from login time)",
    expirationFromRefreshTime < expirationFromLoginTime,
  );

  // Step 8: Verify tokens have different values (new tokens issued)
  TestValidator.notEquals(
    "refreshed access token should differ from initial access token",
    refreshedToken.access,
    initialToken.access,
  );

  TestValidator.notEquals(
    "refreshed refresh token should differ from initial refresh token",
    refreshedToken.refresh,
    initialToken.refresh,
  );
}
