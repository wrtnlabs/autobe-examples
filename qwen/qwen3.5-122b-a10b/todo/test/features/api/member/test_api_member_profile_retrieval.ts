import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test authenticated member profile retrieval endpoint.
 *
 * Validates that a registered member can successfully access their own profile information through the protected profile endpoint. The test verifies the complete profile structure, security constraints, and data consistency between registration and retrieval.
 *
 * The test ensures proper authentication flow, correct response schema, and that sensitive data (password hash) is never exposed in API responses. It also validates timestamp formats and account status indicators.
 *
 * 1. Create member connection and register new member account with randomized credentials.
 * 2. Retrieve member profile using the authenticated connection.
 * 3. Validate response contains all required profile fields with correct types.
 * 4. Verify deleted_at is null indicating active account status.
 * 5. Confirm password_hash is excluded from response for security.
 * 6. Validate email and display_name match registration input values.
 * 7. Verify created_at and updated_at are valid ISO date-time format strings.
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const registration = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(registration);
  // 2. Retrieve member profile
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate response structure
  TestValidator.equals(
    "profile id matches registration",
    profile.id,
    registration.id,
  );
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registration.email,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    registration.display_name,
  );
  // 4. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // 5. Validate timestamps are valid ISO date-time format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(profile.updated_at)),
  );
  // 6. Verify created_at <= updated_at (account was created, then updated during registration)
  TestValidator.predicate(
    "created_at <= updated_at",
    new Date(profile.created_at).getTime() <=
      new Date(profile.updated_at).getTime(),
  );
}
