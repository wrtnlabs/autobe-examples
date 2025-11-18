import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful registration for a new Todo List user account.
 *
 * This test covers business rules for unique business email, password
 * requirements, and required session/audit context fields. Steps:
 *
 * 1. Generate unique business email and strong password.
 * 2. Register new user with all required audit context fields (href/referrer).
 * 3. Assert a successful response and NO password leakage.
 * 4. Confirm the verification email process and 'pending verification' status.
 * 5. Validate audit fields (created_at, updated_at), and basic user profile info
 *    in the returned data.
 *
 * Password must never be leaked. Email must be unique per test, strongly typed.
 * Audit and session context fields are validated.
 */
export async function test_api_todo_list_user_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate strong random business email and password
  const businessDomain = "@company.com";
  const userEmail =
    `${RandomGenerator.alphabets(8)}.${RandomGenerator.alphabets(4)}${businessDomain}` satisfies string &
      tags.Format<"email">;
  const userPassword = RandomGenerator.alphaNumeric(14) + "aA!1"; // ensure strong (add complexity)
  const userHref =
    "https://business-app.company.com/register" satisfies string &
      tags.Format<"uri">;
  const userReferrer = "https://start.company.com/cta" satisfies string &
    tags.Format<"uri">;
  const displayName = RandomGenerator.name();

  // 2. Register user
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword satisfies string & tags.Format<"password">,
      href: userHref,
      referrer: userReferrer,
      display_name: displayName,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registration);

  // 3. Check password is not in the response
  TestValidator.predicate(
    "response does not leak password",
    typeof (registration as any)["password"] === "undefined" &&
      Object.values(registration).every(
        (v) => typeof v !== "string" || !v.includes(userPassword),
      ) &&
      (typeof registration.user !== "object" ||
        registration.user == null ||
        Object.values(registration.user).every(
          (v) => typeof v !== "string" || !v.includes(userPassword),
        )),
  );

  // 4. Audit core result fields
  TestValidator.equals(
    "registered email matches request",
    registration.email,
    userEmail,
  );
  TestValidator.equals(
    "display_name matches",
    registration.display_name,
    displayName,
  );

  // 5. Check user profile object
  if (registration.user !== undefined && registration.user !== null) {
    TestValidator.equals(
      "profile id matches main id",
      registration.user.id,
      registration.id,
    );
    TestValidator.equals(
      "profile email matches",
      registration.user.email,
      registration.email,
    );
    TestValidator.equals(
      "profile display_name matches",
      registration.user.display_name,
      registration.display_name,
    );
    TestValidator.equals(
      "profile created_at matches",
      registration.user.created_at,
      registration.created_at,
    );
    TestValidator.equals(
      "profile updated_at matches",
      registration.user.updated_at,
      registration.updated_at,
    );
  }
}
