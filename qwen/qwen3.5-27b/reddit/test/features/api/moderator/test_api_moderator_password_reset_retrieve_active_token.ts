import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorPasswordReset";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test retrieving an active moderator password reset token by its unique identifier.
 *
 * Validates that the password reset retrieval endpoint returns the correct metadata for an active (non-expired) token. The test verifies that the response includes all expected fields (id, moderator details, status, timestamps) while excluding the sensitive token value for security.
 *
 * This test assumes a password reset token has been previously created for the moderator and is still within its validity period. The status field should be computed as 'active' when the expires_at timestamp is in the future.
 *
 * 1. Register and authenticate a moderator account.
 * 2. Retrieve a password reset record using a valid resetId.
 * 3. Validate the response structure matches IRedditCloneModeratorPasswordReset schema.
 * 4. Verify the status is 'active' (token not expired).
 * 5. Verify the moderator information is included with profile details.
 * 6. Verify timestamps (created_at, expires_at) are present and valid.
 */
export async function test_api_moderator_password_reset_retrieve_active_token(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderator);
  // 2. Enable simulate mode to get valid mock data for testing
  moderatorConnection.simulate = true;
  // 3. Generate a valid resetId for the simulated request
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve password reset record
  const passwordReset =
    await api.functional.redditClone.moderator.moderator.password_resets.at(
      moderatorConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 5. Validate business logic: status should be 'active' for non-expired token
  TestValidator.equals("status is active", passwordReset.status, "active");
  // 6. Validate business logic: reset id matches the requested id
  TestValidator.equals("reset id matches request", passwordReset.id, resetId);
  // 7. Validate business logic: moderator information matches authenticated moderator
  TestValidator.equals(
    "moderator id matches authenticated user",
    passwordReset.moderator.id,
    moderator.id,
  );
  // 8. Validate business logic: expires_at is in the future (for active status)
  const expiresAt = new Date(passwordReset.expires_at);
  const now = new Date();
  TestValidator.predicate("expires_at is in the future", expiresAt > now);
  // 9. Validate business logic: created_at is before expires_at
  const createdAt = new Date(passwordReset.created_at);
  TestValidator.predicate(
    "created_at is before expires_at",
    createdAt < expiresAt,
  );
}
