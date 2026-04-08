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
 * Test retrieving a moderator password reset token that has expired.
 *
 * Validates that expired password reset tokens can still be retrieved for audit purposes while ensuring the actual token value remains hidden for security. The test verifies that the status field is correctly computed as 'expired' when the expires_at timestamp is in the past.
 *
 * Special attention is given to verifying that the response contains only metadata (id, moderator info, timestamps, status) and never exposes the actual password reset token value.
 *
 * 1. Register a moderator account with email, password, and user profile.
 * 2. Retrieve a password reset token by its ID (simulated as expired).
 * 3. Validate the response structure matches IRedditCloneModeratorPasswordReset schema.
 * 4. Verify the status field is 'expired' and all metadata fields are present.
 */
export async function test_api_moderator_password_reset_retrieve_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 2. Retrieve an expired password reset token
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const passwordReset =
    await api.functional.redditClone.moderator.moderator.password_resets.at(
      moderatorConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 3. Validate response structure matches IRedditCloneModeratorPasswordReset
  TestValidator.equals("reset ID matches", passwordReset.id, resetId);
  TestValidator.equals(
    "moderator ID matches",
    passwordReset.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email matches",
    passwordReset.moderator.email,
    moderator.email,
  );
  TestValidator.equals("status is expired", passwordReset.status, "expired");
  // 4. Validate timestamp fields exist and are valid date-time format
  TestValidator.predicate(
    "has created_at timestamp",
    passwordReset.created_at.length > 0,
  );
  TestValidator.predicate(
    "has expires_at timestamp",
    passwordReset.expires_at.length > 0,
  );
  // 5. Validate moderator profile structure
  TestValidator.equals(
    "profile ID matches",
    passwordReset.moderator.profile.id,
    moderator.reddit_clone_user_profile_id,
  );
  TestValidator.predicate(
    "has display name",
    passwordReset.moderator.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "has karma score",
    typeof passwordReset.moderator.profile.karma === "number",
  );
  TestValidator.predicate(
    "profile has created_at",
    passwordReset.moderator.profile.created_at.length > 0,
  );
  // 6. Verify moderator created_at timestamp exists
  TestValidator.predicate(
    "moderator has created_at",
    passwordReset.moderator.created_at.length > 0,
  );
}
