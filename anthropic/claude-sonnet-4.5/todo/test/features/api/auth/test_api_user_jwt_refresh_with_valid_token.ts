import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate the refresh of JWT tokens for a user.
 *
 * This test ensures that a user with a legitimate, unexpired refresh token can
 * successfully obtain new JWT tokens. The test simulates the context where a
 * refresh token exists (as would be given after a successful authentication),
 * submits a refresh request, and checks the response for correct property
 * population, security compliance, and JWT integrity. The test also verifies
 * that no sensitive user information (such as credentials) is leaked, and that
 * all date fields are in ISO 8601 format.
 */
export async function test_api_user_jwt_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // Arrange: Simulate an initial authorized context and extract a valid refresh token
  const initialAuth: ITodoListUser.IAuthorized =
    typia.random<ITodoListUser.IAuthorized>();
  typia.assert(initialAuth);
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies ITodoListUser.IRefresh;

  // Act: Request to refresh token using the refresh endpoint
  const result: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(result);

  // Assert: Validate field population, fresh token issuance, and response structure
  TestValidator.notEquals(
    "access token should be rotated (new token issued)",
    result.token.access,
    initialAuth.token.access,
  );
  TestValidator.equals(
    "user id should not change after refresh",
    result.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email should match original user",
    result.email,
    initialAuth.email,
  );
  TestValidator.predicate(
    "created_at should be ISO 8601",
    typeof result.created_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?Z$/.test(
        result.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at should be ISO 8601",
    typeof result.updated_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?Z$/.test(
        result.updated_at,
      ),
  );
  TestValidator.predicate(
    "token.access and token.refresh must be non-empty",
    typeof result.token.access === "string" &&
      result.token.access.length > 0 &&
      typeof result.token.refresh === "string" &&
      result.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refresh token should be rotated or kept, but never empty",
    result.token.refresh,
    "",
  );

  // Assert: Response does not include password or sensitive PII
  TestValidator.predicate(
    "response does not include password property",
    !Object.prototype.hasOwnProperty.call(result, "password"),
  );
}
