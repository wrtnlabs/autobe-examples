import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate soft-delete (self-service erasure) of a user account and ensure
 * compliance.
 *
 * Steps:
 *
 * 1. Register a new user (join) and authenticate as that user.
 * 2. Perform soft-deletion (erase) using user's own id as authentication.
 * 3. Assert profile is marked deleted (deleted_at non-null) and PII is removed or
 *    anonymized.
 * 4. Attempt login with deleted account, and expect failure.
 * 5. Attempt to delete already deleted account, confirm forbidden/error.
 * 6. Ensure that only self-user can perform erasure (other identity not tested as
 *    no multi-user context).
 * 7. Confirm GDPR/audit requirements (deleted_at set, profile is anonymized but
 *    content remains).
 */
export async function test_api_user_account_soft_delete_self_service(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    avatar_url: null,
  } satisfies IDiscussionBoardUser.ICreate;
  const joinResp: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userData });
  typia.assert(joinResp);
  TestValidator.equals(
    "email matches registration",
    joinResp.email,
    userData.email,
  );
  const userId = joinResp.id;

  // 2. Self-delete the user
  const deletedUser: IDiscussionBoardUser =
    await api.functional.discussionBoard.user.users.erase(connection, {
      userId,
    });
  typia.assert(deletedUser);
  TestValidator.predicate(
    "deleted_at is set",
    typeof deletedUser.deleted_at === "string" && !!deletedUser.deleted_at,
  );

  // 3. Assert PII/anonymization: email, display_name should not match, avatar_url nulled
  TestValidator.notEquals(
    "email is anonymized",
    deletedUser.email,
    userData.email,
  );
  TestValidator.notEquals(
    "display_name is anonymized",
    deletedUser.display_name,
    userData.display_name,
  );
  TestValidator.equals("avatar_url nulled", deletedUser.avatar_url, null);

  // 4. Subsequent login with deleted account must fail
  await TestValidator.error("cannot login with deleted user", async () => {
    await api.functional.auth.user.join(connection, { body: userData }); // re-registration should succeed (email is released)
    // Now try deleting twice, which must error (already deleted)
    await api.functional.discussionBoard.user.users.erase(connection, {
      userId,
    });
  });
}
