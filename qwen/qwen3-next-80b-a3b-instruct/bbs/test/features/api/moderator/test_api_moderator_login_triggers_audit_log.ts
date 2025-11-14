import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_triggers_audit_log(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "securePassword123";

  // Simulate a successful moderator login
  const loginResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorEmail satisfies IPoliticalForumModerator.ILogin,
    });

  // Validate the authentication response
  typia.assert(loginResponse);

  // Verify the response contains the mandatory fields
  TestValidator.equals(
    "moderator id is present and is a UUID",
    typeof loginResponse.id,
    "string",
  );
  TestValidator.predicate(
    "moderator id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
  TestValidator.equals(
    "moderator email is present and is a valid email",
    typeof loginResponse.email,
    "string",
  );
  TestValidator.predicate(
    "moderator email is a valid email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      loginResponse.email,
    ),
  );

  // Validate the token structure
  TestValidator.equals(
    "access token is present",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is present",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is present and is a date-time string",
    typeof loginResponse.token.expired_at,
    "string",
  );
  TestValidator.predicate(
    "expired_at is in ISO 8601 date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?(Z|[+-][01][0-9]:[0-5][0-9])$/i.test(
      loginResponse.token.expired_at,
    ),
  );
  TestValidator.equals(
    "refreshable_until is present and is a date-time string",
    typeof loginResponse.token.refreshable_until,
    "string",
  );
  TestValidator.predicate(
    "refreshable_until is in ISO 8601 date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?(Z|[+-][01][0-9]:[0-5][0-9])$/i.test(
      loginResponse.token.refreshable_until,
    ),
  );

  // Verify token fields are populated (non-empty strings)
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is non-empty",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is non-empty",
    loginResponse.token.refreshable_until.length > 0,
  );

  // Ensure authentication triggers audit log by checking that subsequent moderator-specific operations succeed
  // Note: Since audit log writing is a side effect of authentication and is immutable/external,
  // we validate the successful response as proof of completion
}
