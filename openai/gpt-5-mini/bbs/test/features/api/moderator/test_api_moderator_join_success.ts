import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_join_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique registration data
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(8)}!A1`; // at least 12 chars: combine later
  const strongPassword =
    password.length >= 12
      ? password
      : password + RandomGenerator.alphaNumeric(12 - password.length);
  const display_name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createBody = {
    username,
    email,
    password: strongPassword,
    display_name,
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  // 2) Call join API and validate successful authorization response
  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  // Runtime type validation
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 3) Business assertions
  TestValidator.equals(
    "returned username matches request",
    authorized.username,
    username,
  );
  // display_name may be optional in response; if present, ensure it matches
  if (
    authorized.display_name !== undefined &&
    authorized.display_name !== null
  ) {
    TestValidator.equals(
      "returned display_name matches request",
      authorized.display_name,
      display_name,
    );
  }

  // Token basic format checks (JWT-like: contains at least two dots)
  TestValidator.predicate(
    "access token looks like JWT",
    typeof authorized.token.access === "string" &&
      authorized.token.access.includes(".") &&
      authorized.token.access.length > 20,
  );
  TestValidator.predicate(
    "refresh token looks like token string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 20,
  );

  // created_at / updated_at should be present and valid date-time strings (typia.assert already validated formats)
  TestValidator.predicate(
    "created_at present",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof authorized.updated_at === "string" &&
      authorized.updated_at.length > 0,
  );

  // 4) Security: ensure password_hash is NOT exposed in response object
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in (authorized as any)),
  );

  // 5) Duplicate username should be rejected (409)
  const dupByUsername = {
    username,
    email: typia.random<string & tags.Format<"email">>(), // different email
    password: strongPassword,
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  await TestValidator.httpError(
    "duplicate username should return 409",
    409,
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: dupByUsername,
      });
    },
  );

  // 6) Duplicate email should be rejected (409)
  const dupByEmail = {
    username: `mod_${RandomGenerator.alphaNumeric(8)}`,
    email,
    password: strongPassword,
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  await TestValidator.httpError(
    "duplicate email should return 409",
    409,
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: dupByEmail,
      });
    },
  );
}
