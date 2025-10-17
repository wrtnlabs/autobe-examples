import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates the full workflow of registering a new member user account on the
 * discussion board.
 *
 * This test covers:
 *
 * - Successful registration with valid email, password, and display name.
 * - Verification of returned authentication tokens (JWT).
 * - Failure upon attempting to register with an email that's already used.
 *
 * It simulates the key entry point for member functionality and ensures robust
 * handling of duplicate registrations and proper JWT token issuance.
 *
 * The test uses random and valid test data for emails and display names, and
 * checks for proper response structure and data types.
 *
 * Steps:
 *
 * 1. Register a new member.
 * 2. Validate response data and token structure.
 * 3. Attempt duplicate registration with the same email.
 * 4. Expect an error to confirm server-side duplicate email rejection.
 */
export async function test_api_member_join_new_user(
  connection: api.IConnection,
) {
  // Step 1: Generate random valid member creation data
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123"; // valid password with letters and numbers
  const displayName = RandomGenerator.name();

  const createRequest = {
    email,
    password,
    display_name: displayName,
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 2: Call the join API to register a new member
  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createRequest,
    });
  typia.assert(authorized);

  // Step 3: Validate fields of response for expected values
  TestValidator.equals(
    "created member email matches request",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "created member display name matches request",
    authorized.display_name,
    displayName,
  );
  TestValidator.predicate(
    "member ID is in UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "token access is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is valid ISO date-time",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is valid ISO date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );

  // Step 4: Attempt to register again with the same email - expect an error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email,
          password: "DiffPass123",
          display_name: "AnotherName",
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );
}
