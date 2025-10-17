import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_password_request_reset_existing_user(
  connection: api.IConnection,
) {
  // Create a unique test user (sanitize username to avoid whitespace)
  const rawName = RandomGenerator.name(1);
  const username = `${rawName.replace(/\s+/g, "").toLowerCase()}${RandomGenerator.alphaNumeric(4)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    username,
    email,
    password: `P@ssw0rd-${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // 1) Request password reset for the created (existing) user
  const reqExisting = {
    email,
  } satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset;

  const resExisting: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      { body: reqExisting },
    );
  typia.assert(resExisting);

  // 2) Request password reset for a random (likely non-existent) email
  let otherEmail = typia.random<string & tags.Format<"email">>();
  if (otherEmail === email)
    otherEmail = `nope+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const reqNonExist = {
    email: otherEmail,
  } satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset;

  const resNonExist: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      { body: reqNonExist },
    );
  typia.assert(resNonExist);

  // Assertions: both responses are generic success and should not leak the email
  TestValidator.equals(
    "password reset success for existing user",
    resExisting.success,
    true,
  );

  TestValidator.equals(
    "password reset success for non-existing user (generic)",
    resNonExist.success,
    true,
  );

  TestValidator.predicate(
    "existing response message does not contain the target email",
    resExisting.message === undefined ||
      !String(resExisting.message).includes(email),
  );

  TestValidator.predicate(
    "non-existing response message does not contain the target email",
    resNonExist.message === undefined ||
      !String(resNonExist.message).includes(otherEmail),
  );

  // Additional check: the presence/absence of 'message' should be structurally similar
  TestValidator.predicate(
    "responses share generic structure (both have 'message' or both don't)",
    (resExisting.message === undefined) === (resNonExist.message === undefined),
  );

  // Note: cleanup of created user and password reset records should be handled
  // by the test environment isolation (DB reset between tests). This test does
  // not attempt to delete server records because SDK has no delete endpoint
  // exposed for the registered user in provided materials.
}
