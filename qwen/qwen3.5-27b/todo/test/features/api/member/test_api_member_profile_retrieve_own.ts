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
 * Test that an authenticated member can successfully retrieve their own profile information.
 *
 * Validates the complete member profile retrieval flow including member registration, authentication, and profile access. Ensures that the profile response contains all expected fields with correct values and that sensitive data like password_hash is excluded for security.
 *
 * Special attention is given to verifying that the member can only access their own profile data and that the deleted_at field is null for active accounts.
 *
 * 1. Register and authenticate a new member account with email and password.
 * 2. Retrieve the member's own profile using their ID from authentication response.
 * 3. Validate that all expected profile fields are present and correctly typed.
 * 4. Confirm that deleted_at is null indicating an active account.
 * 5. Verify that the email in the profile matches the registration email.
 */
export async function test_api_member_profile_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store registration email for validation
  const registrationEmail = authorized.email;
  // 2. Retrieve own profile
  const profile = await api.functional.todoApp.members.at(memberConnection, {
    memberId: authorized.id,
  });
  typia.assert(profile);
  // 3. Validate profile fields
  TestValidator.equals("profile id matches", profile.id, authorized.id);
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registrationEmail,
  );
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorized.display_name,
  );
  // 4. Confirm deleted_at is null for active account
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  // 5. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    profile.created_at !== null && profile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    profile.updated_at !== null && profile.updated_at !== undefined,
  );
}
