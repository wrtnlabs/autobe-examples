import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";

export async function test_api_verified_expert_registration_defaults_without_preferences(
  connection: api.IConnection,
) {
  // Prepare a clean unauthenticated connection clone (no manual header ops after creation)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Minimal registration payload without optional preferences
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const displayName = RandomGenerator.name(1);

  const body = {
    email,
    password,
    display_name: displayName,
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(unauthConn, { body });
  // Full type check including UUIDs and ISO timestamps
  typia.assert(authorized);

  // Business rule validations
  TestValidator.equals(
    "role fixed to verifiedExpert",
    authorized.role,
    "verifiedExpert",
  );
  TestValidator.equals(
    "email_verified defaults to false on join",
    authorized.email_verified,
    false,
  );
  TestValidator.equals(
    "mfa_enabled defaults to false on join",
    authorized.mfa_enabled,
    false,
  );
  TestValidator.equals(
    "display_name echoes the input value",
    authorized.display_name,
    displayName,
  );

  // 2) Duplicate email should be rejected (business rule error)
  const dupConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "duplicate email cannot register again",
    async () => {
      await api.functional.auth.verifiedExpert.join(dupConn, {
        body: {
          email,
          password: typia.random<string & tags.MinLength<8>>(),
          display_name: RandomGenerator.name(1),
        } satisfies IEconDiscussVerifiedExpertJoin.ICreate,
      });
    },
  );
}
