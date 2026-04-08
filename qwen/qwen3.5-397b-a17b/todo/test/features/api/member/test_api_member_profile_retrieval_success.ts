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
 * Validates the complete member profile retrieval workflow including account registration, authentication, and profile data access. Ensures that the profile endpoint returns all required fields with correct values and that the account state is properly reflected.
 *
 * Special attention is given to verifying that the display name matches the registration input, timestamps are properly formatted, and the account is in active state with deleted_at being null.
 *
 * 1. Register a new member account with email, password, and display name.
 * 2. Retrieve the member's profile via GET /todoApp/member/profile.
 * 3. Validate all required fields exist: id, display_name, created_at, updated_at, deleted_at.
 * 4. Verify created_at and updated_at are equal (no updates since creation).
 * 5. Verify deleted_at is null indicating active account.
 * 6. Confirm display_name matches the value provided during registration.
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const displayName = RandomGenerator.name();
  const authorized = await authorize_member_join(connection, {
    body: {
      displayName,
    },
  });
  typia.assert(authorized);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Retrieve member profile
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 4. Validate profile data matches registration
  TestValidator.equals("member id matches", profile.id, authorized.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    displayName,
  );
  TestValidator.equals(
    "created_at equals updated_at",
    profile.created_at,
    profile.updated_at,
  );
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
}
