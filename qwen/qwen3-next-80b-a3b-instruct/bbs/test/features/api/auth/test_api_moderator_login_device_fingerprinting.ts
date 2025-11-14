import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_device_fingerprinting(
  connection: api.IConnection,
) {
  // Generate a valid moderator login credential string (per ILogin = string)
  const moderatorCredential = typia.random<string & tags.Format<"email">>();

  // Perform moderator login to obtain authentication token
  const authResult: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorCredential satisfies IPoliticalForumModerator.ILogin,
    });

  // Validate the authentication response structure
  typia.assert(authResult);

  // Verify the returned token structure contains required fields
  TestValidator.equals(
    "token should have access field",
    authResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token should have refresh field",
    authResult.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at should be valid ISO-8601 date-time",
    () => !isNaN(Date.parse(authResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO-8601 date-time",
    () => !isNaN(Date.parse(authResult.token.refreshable_until)),
  );

  // Validate that the moderator ID and email are correctly returned
  TestValidator.equals(
    "moderator ID should be UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      authResult.id,
    ),
    true,
  );
  TestValidator.equals(
    "moderator email should match credential",
    authResult.email,
    moderatorCredential,
  );
}
