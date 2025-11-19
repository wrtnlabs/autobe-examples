import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * E2E test for user registration (join): happy path, existing-email error, and
 * password policy error.
 *
 * 1. Register a new user with a unique email and valid password: expect account
 *    creation, valid schema, and JWT tokens present.
 * 2. Attempt duplicate registration using the same email: expect failure, error
 *    thrown, and appropriate error message (uniqueness enforced).
 * 3. Attempt registration with a password shorter than the policy minimum (e.g. 7
 *    chars): expect failure, error thrown, and error message about password
 *    policy violation.
 * 4. Verify that registration is allowed without any authentication and the
 *    returned object strictly matches the schema, including the token
 *    structure.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // --- 1. Successful registration ---
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string &
    tags.MinLength<8> &
    tags.MaxLength<72> &
    tags.Format<"password"> = RandomGenerator.alphaNumeric(12);
  const requestBody = {
    email,
    password,
  } satisfies IDiscussionBoardUser.ICreate;

  const created: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: requestBody });
  typia.assert(created);
  TestValidator.equals(
    "created user email matches request",
    created.email,
    email,
  );
  TestValidator.predicate(
    "created user id is uuid",
    typeof created.id === "string" && /^[0-9a-f-]{36}$/i.test(created.id),
  );
  TestValidator.predicate(
    "token object present",
    created.token && typeof created.token === "object",
  );
  typia.assert(created.token);

  // --- 2. Duplicate email registration should fail ---
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  });

  // --- 3. Short password policy violation should fail ---
  await TestValidator.error(
    "registration fails when password is too short",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(7), // less than 8 chars (minimum)
        } satisfies IDiscussionBoardUser.ICreate,
      });
    },
  );

  // --- 4. Registration works without authentication, all returned fields strictly conform to schema ---
  // (already tested in step 1)
  typia.assert(created);
  typia.assert<IAuthorizationToken>(created.token);
  TestValidator.equals(
    "access token present",
    typeof created.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token present",
    typeof created.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "token timestamps are ISO8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      created.token.expired_at,
    ) &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
        created.token.refreshable_until,
      ),
  );
}
