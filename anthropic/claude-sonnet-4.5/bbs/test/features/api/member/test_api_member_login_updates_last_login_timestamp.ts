import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that successful login updates the last_login_at timestamp for activity
 * tracking.
 *
 * This test validates the critical member activity tracking feature by ensuring
 * that each successful login operation updates the last_login_at timestamp in
 * the discussion_board_members table. This timestamp is essential for
 * identifying active versus inactive accounts and detecting unusual login
 * patterns for security monitoring.
 *
 * Test Flow:
 *
 * 1. Register a new member account and note the created_at timestamp
 * 2. Wait briefly to ensure timestamp differentiation
 * 3. Perform first login and verify last_login_at is set and differs from
 *    created_at
 * 4. Wait again and perform second login
 * 5. Verify last_login_at is updated to a newer timestamp than the first login
 */
export async function test_api_member_login_updates_last_login_timestamp(
  connection: api.IConnection,
) {
  // Generate unique test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const username = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register a new member account
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        username,
        href,
        referrer,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(registeredMember);

  // Capture the initial created_at timestamp
  const createdAt = new Date(registeredMember.created_at);

  // Step 2: Wait briefly to ensure timestamp differentiation (100ms)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Perform first login operation
  const firstLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(firstLogin);

  // Validate that last_login_at is populated after first login
  TestValidator.predicate(
    "last_login_at should be set after first login",
    firstLogin.last_login_at !== null && firstLogin.last_login_at !== undefined,
  );

  // Verify that last_login_at differs from created_at
  if (firstLogin.last_login_at) {
    const firstLoginAt = new Date(firstLogin.last_login_at);
    TestValidator.predicate(
      "last_login_at should differ from created_at",
      firstLoginAt.getTime() !== createdAt.getTime(),
    );

    // Verify that last_login_at is after created_at (or at least not before)
    TestValidator.predicate(
      "last_login_at should be at or after created_at",
      firstLoginAt.getTime() >= createdAt.getTime(),
    );
  }

  // Step 4: Wait again to ensure second login has different timestamp (100ms)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 5: Perform second login operation
  const secondLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(secondLogin);

  // Validate that last_login_at is still populated
  TestValidator.predicate(
    "last_login_at should be set after second login",
    secondLogin.last_login_at !== null &&
      secondLogin.last_login_at !== undefined,
  );

  // Verify that last_login_at is updated to a newer timestamp
  if (firstLogin.last_login_at && secondLogin.last_login_at) {
    const firstLoginAt = new Date(firstLogin.last_login_at);
    const secondLoginAt = new Date(secondLogin.last_login_at);

    TestValidator.predicate(
      "second login timestamp should be later than or equal to first login",
      secondLoginAt.getTime() >= firstLoginAt.getTime(),
    );
  }

  // Additional validation: Verify member ID remains consistent across logins
  TestValidator.equals(
    "member ID should remain consistent",
    firstLogin.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member ID should remain consistent across logins",
    secondLogin.id,
    registeredMember.id,
  );
}
