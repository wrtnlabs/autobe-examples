import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_assigns_active_status(
  connection: api.IConnection,
) {
  // Step 1: Generate moderator registration credentials with valid constraints
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  // Step 2: Register a new moderator account
  const registrationResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Step 3: Validate the response structure and types
  typia.assert(registrationResponse);

  // Step 4: Verify the moderator has active account status upon creation
  TestValidator.equals(
    "moderator account status should be active upon registration",
    registrationResponse.moderator.account_status,
    "active",
  );

  // Step 5: Verify the response includes moderator summary information matching input
  TestValidator.equals(
    "moderator display name matches registration input",
    registrationResponse.moderator.display_name,
    moderatorDisplayName,
  );

  // Step 6: Verify the moderator ID is a valid UUID
  TestValidator.predicate("moderator ID is valid UUID format", () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(registrationResponse.id);
  });

  // Step 7: Verify authorization tokens are provided for immediate access
  TestValidator.predicate(
    "access token exists and is non-empty",
    registrationResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists and is non-empty",
    registrationResponse.token.refresh.length > 0,
  );

  // Step 8: Verify token expiration dates are properly set in the future
  TestValidator.predicate(
    "access token expiration is set to a future timestamp",
    () => {
      const expirationDate = new Date(registrationResponse.token.expired_at);
      return expirationDate > new Date();
    },
  );

  TestValidator.predicate(
    "refresh token is refreshable until a future timestamp",
    () => {
      const refreshableDate = new Date(
        registrationResponse.token.refreshable_until,
      );
      return refreshableDate > new Date();
    },
  );

  // Step 9: Verify moderator has full privileges with active status
  // The presence of valid authorization tokens and active account status
  // demonstrates that the moderator can immediately access moderation features
  TestValidator.equals(
    "moderator account status enables immediate access without additional activation",
    registrationResponse.moderator.account_status,
    "active",
  );
}
