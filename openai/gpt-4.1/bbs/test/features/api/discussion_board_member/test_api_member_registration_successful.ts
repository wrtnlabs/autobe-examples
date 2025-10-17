import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate successful member registration and uniqueness constraints.
 *
 * This test ensures that a new user can register using unique email and
 * username, that passwords are not returned, the new member is unverified, and
 * the required audit fields exist. It also checks that duplicate registration
 * attempts (for both email and username) are rejected by the server per
 * business rules.
 *
 * Steps:
 *
 * 1. Generate unique test email, username, and password.
 * 2. Register new member, assert returned payload type and values (email_verified
 *    is false, token exists, audit fields are valid, password hash not present
 *    in payload).
 * 3. Attempt to register again with the same email and a new username, verify
 *    duplication error.
 * 4. Attempt to register again with the same username and a new email, verify
 *    duplication error.
 */
export async function test_api_member_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate unique email, username, password
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.name(1);
  const password: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(12) as string & tags.Format<"password">;

  // Step 2: Register new member
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals("registered email matches input", member.email, email);
  TestValidator.equals(
    "registered username matches input",
    member.username,
    username,
  );
  TestValidator.equals(
    "member is not verified on registration",
    member.email_verified,
    false,
  );
  TestValidator.predicate(
    "registration_completed_at is ISO 8601",
    typeof member.registration_completed_at === "string" &&
      member.registration_completed_at.includes("T"),
  );
  TestValidator.predicate(
    "token returned and is valid",
    member.token && typeof member.token.access === "string",
  );
  // Check audit fields are present
  TestValidator.predicate(
    "member id is uuid",
    typeof member.id === "string" && member.id.length >= 36,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof member.created_at === "string" && member.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof member.updated_at === "string" && member.updated_at.includes("T"),
  );

  // Step 3: Attempt duplicate registration with same email
  const newUsername = RandomGenerator.name(1);
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username: newUsername,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  });

  // Step 4: Attempt duplicate registration with same username
  const newEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "duplicate username registration fails",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: newEmail,
          username,
          password,
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );
}
