import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
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
 * Test successful moderator login with valid credentials.
 *
 * Validates the complete moderator authentication flow including account registration and login. Ensures that valid credentials result in proper JWT token generation with correct expiration times, and that the response includes complete moderator account information with user profile details.
 *
 * Special attention is given to verifying token expiration times (access token ~15 minutes, refresh token ~7 days) and that the moderator's user profile is correctly linked and returned in the authentication response.
 *
 * 1. Generate and store unique credentials (email and password) for the test.
 * 2. Register a new moderator account with the generated credentials and user profile information.
 * 3. Create a new moderator connection object for the login operation.
 * 4. Prepare login credentials using the stored email and password.
 * 5. Execute moderator login using the authorize_moderator_login utility function.
 * 6. Validate that the response contains valid JWT access and refresh tokens.
 * 7. Validate that the response includes moderator account information (id, email, userProfile).
 * 8. Validate that the access token expiration is approximately 15 minutes from now.
 * 9. Validate that the refresh token expiration is approximately 7 days from now.
 * 10. Validate that the moderator's user profile information is included and valid.
 * 11. Validate that the moderator account was created successfully with proper timestamps.
 */
export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate and store unique credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const registeredModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(registeredModerator);
  // 3. Create a new moderator connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Prepare login credentials using stored credentials
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneModerator.ILogin;
  // 5. Execute moderator login
  const loggedInModerator = await authorize_moderator_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInModerator);
  // 6. Validate JWT tokens exist
  TestValidator.predicate(
    "access token exists",
    loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedInModerator.token.refresh.length > 0,
  );
  // 7. Validate moderator account information
  TestValidator.equals(
    "moderator id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loggedInModerator.id,
    ),
    true,
  );
  TestValidator.equals("email matches", loggedInModerator.email, email);
  TestValidator.predicate(
    "user profile id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loggedInModerator.reddit_clone_user_profile_id,
    ),
  );
  // 8. Validate access token expiration (~15 minutes)
  const now = new Date();
  const expiredAt = new Date(loggedInModerator.token.expired_at);
  const accessExpiryMinutes =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessExpiryMinutes >= 14 && accessExpiryMinutes <= 16,
  );
  // 9. Validate refresh token expiration (~7 days)
  const refreshableUntil = new Date(loggedInModerator.token.refreshable_until);
  const refreshExpiryDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token expires in ~7 days",
    refreshExpiryDays >= 6.5 && refreshExpiryDays <= 7.5,
  );
  // 10. Validate user profile information
  TestValidator.predicate(
    "display name exists",
    loggedInModerator.userProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "karma is initialized",
    loggedInModerator.userProfile.karma === 0,
  );
  TestValidator.predicate(
    "created_at exists",
    loggedInModerator.userProfile.created_at.length > 0,
  );
  // 11. Validate account timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    loggedInModerator.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    loggedInModerator.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loggedInModerator.deleted_at,
    null,
  );
}
