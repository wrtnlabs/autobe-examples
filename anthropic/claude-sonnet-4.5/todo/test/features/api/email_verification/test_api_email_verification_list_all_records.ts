import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of all email verification records for a user with default
 * pagination settings.
 *
 * This scenario validates the basic listing functionality without any filters
 * applied. The test workflow: 1) Register a new user account which
 * automatically creates initial email verification records, 2) Request the
 * email verification list for that user without any filter parameters, 3)
 * Verify the response includes pagination metadata with correct structure, 4)
 * Verify the response contains the expected verification records with all
 * required fields (id, user_id, created_at, expires_at, verified status). This
 * tests the fundamental list retrieval operation ensuring users and
 * administrators can view verification history.
 */
export async function test_api_email_verification_list_all_records(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateData,
    });
  typia.assert(createdUser);

  // Step 2: Request email verification list without filters (default pagination)
  const requestBody = {} satisfies ITodoListEmailVerification.IRequest;

  const verificationList: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: createdUser.id,
        body: requestBody,
      },
    );
  typia.assert(verificationList);

  // Step 3: Verify at least one verification record exists (created during registration)
  TestValidator.predicate(
    "at least one verification record exists",
    verificationList.data.length > 0,
  );

  // Step 4: Validate each verification record belongs to the created user
  for (const verification of verificationList.data) {
    typia.assert(verification);

    TestValidator.equals(
      "verification belongs to created user",
      verification.todo_list_user_id,
      createdUser.id,
    );
  }
}
