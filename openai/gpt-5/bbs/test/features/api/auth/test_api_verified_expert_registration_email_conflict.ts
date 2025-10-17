import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";

export async function test_api_verified_expert_registration_email_conflict(
  connection: api.IConnection,
) {
  /**
   * Purpose: ensure duplicate email registration is rejected while the initial
   * registration succeeds and returns a valid authorization envelope.
   *
   * Steps:
   *
   * 1. Register a verified expert account with a unique email
   * 2. Validate core business fields on success (role and initial email_verified)
   * 3. Attempt to register again with the same email and expect an error
   *
   * Notes:
   *
   * - Do not assert specific HTTP statuses; only verify an error occurs
   * - Use strict DTO typing via `satisfies` and tag-aware generators
   * - Never touch connection.headers; SDK manages tokens automatically
   */

  // 1) Prepare a unique email and valid registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const createBody1 = {
    email,
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  // 2) Execute join and validate response structure and key business fields
  const success = await api.functional.auth.verifiedExpert.join(connection, {
    body: createBody1,
  });
  typia.assert(success);
  TestValidator.equals(
    "role is verifiedExpert",
    success.role,
    "verifiedExpert",
  );
  TestValidator.predicate(
    "email should not be verified immediately after join",
    success.email_verified === false,
  );

  // 3) Attempt duplicate registration with the same email, expect error
  const createBody2 = {
    email, // duplicate email
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<120>
    >(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  await TestValidator.error(
    "duplicate email registration must fail",
    async () => {
      await api.functional.auth.verifiedExpert.join(connection, {
        body: createBody2,
      });
    },
  );
}
