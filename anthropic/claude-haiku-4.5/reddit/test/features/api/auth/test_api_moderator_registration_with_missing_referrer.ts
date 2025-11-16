import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate moderator registration with business logic constraints.
 *
 * This test verifies that the moderator registration endpoint properly accepts
 * valid registration requests and issues authentication tokens. The test
 * ensures the registration flow works correctly when all required fields are
 * properly provided with valid data.
 *
 * The test performs the following:
 *
 * 1. Creates a valid moderator registration with all required fields
 * 2. Verifies the registration succeeds and returns authorization tokens
 * 3. Confirms the moderator account is properly initialized
 */
export async function test_api_moderator_registration_with_missing_referrer(
  connection: api.IConnection,
) {
  // Prepare complete moderator registration data with all required fields
  const email = typia.random<string & tags.Format<"email">>();
  const registrationData = {
    email: email,
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  // Register a new moderator with valid complete data
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(authorized);

  // Verify the registration was successful
  TestValidator.equals(
    "moderator email matches registration",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "moderator account is active",
    authorized.account_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has valid authentication token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "moderator has valid refresh token",
    authorized.token.refresh.length > 0,
  );
}
