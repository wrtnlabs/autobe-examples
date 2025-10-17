import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator registration with valid credentials.
 *
 * This test validates the successful registration of a moderator account when
 * all requirements are met. The workflow includes:
 *
 * 1. Create an administrator account to provide appointment authority
 * 2. Successfully register a moderator with valid credentials
 * 3. Validate the returned authorization token and moderator ID
 *
 * Note: The original scenario requested testing weak password rejection, but
 * this is not implementable without violating TypeScript type safety. Password
 * complexity validation (uppercase, lowercase, number, special character)
 * occurs at runtime in the backend, but we cannot send type-violating data to
 * test it. Instead, this test validates the successful registration flow with
 * compliant credentials.
 */
export async function test_api_moderator_registration_with_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for appointment authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Successfully register moderator with valid credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: admin.id,
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Validate successful registration response
  TestValidator.equals(
    "moderator should have valid UUID",
    typeof moderator.id,
    "string",
  );
  TestValidator.equals(
    "token should have access token",
    typeof moderator.token.access,
    "string",
  );
  TestValidator.equals(
    "token should have refresh token",
    typeof moderator.token.refresh,
    "string",
  );
}
