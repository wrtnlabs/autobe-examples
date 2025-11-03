import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate the workflow for admin registration and email verification.
 *
 * This test covers registration of a new community platform admin by submitting
 * a unique email, strong password, and display name. It confirms success
 * triggers admin verification via issuance of a token, and enforces uniqueness
 * of the email, strong password, and display name constraints per schema.
 *
 * Steps:
 *
 * 1. Register a new admin using valid, random and unique data (email, password,
 *    display_name, href, referrer, ip).
 * 2. Validate the returned response structure and that the token and admin
 *    projection are present.
 * 3. Attempt registration again with the same email, expect failure due to unique
 *    email enforcement.
 * 4. Attempt registration with a password that violates minimum length, expect
 *    failure due to validation.
 * 5. Attempt registration with a display name that is empty (violating minLength),
 *    expect failure due to validation.
 */
export async function test_api_admin_registration_with_email_verification(
  connection: api.IConnection,
) {
  // 1. Generate random admin registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // strong password (minLength 8)
  const display_name = RandomGenerator.name(2).substring(0, 80); // ensure length
  const href = "https://admin-portal.example.com/register";
  const referrer = "https://community-landing.example.com";
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // 2. Register new admin with valid data (success case)
  const createBody = {
    email,
    password,
    display_name,
    href,
    referrer,
    ip,
  } satisfies ICommunityPlatformAdmin.ICreate;

  const authorized = await api.functional.auth.admin.join(connection, {
    body: createBody,
  });
  typia.assert(authorized);

  // 3. Validate that token and admin summary are present
  TestValidator.predicate(
    "authorized token is present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.equals(
    "authorized email matches input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "authorized display name matches input",
    authorized.display_name,
    display_name,
  );
  TestValidator.predicate(
    "admin id is UUID",
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
      authorized.id,
    ),
  );
  TestValidator.equals(
    "admin summary display name matches",
    authorized.admin?.display_name,
    display_name,
  );

  // 4. Attempt to register with the same email -> must error
  await TestValidator.error("duplicate email is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: { ...createBody, display_name: RandomGenerator.name(2) },
    }); // change display_name to avoid unique constraint
  });

  // 5. Attempt with short password
  await TestValidator.error(
    "password below minimum length is rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          ...createBody,
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(6),
        },
      });
    },
  );

  // 6. Attempt with empty display_name
  await TestValidator.error("empty display_name is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        ...createBody,
        email: typia.random<string & tags.Format<"email">>(),
        display_name: "",
      },
    });
  });
}
