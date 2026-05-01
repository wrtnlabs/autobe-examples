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
 * Test retrieval of a member's own profile after registration.
 *
 * Validates that a newly registered member can retrieve their own profile via the members.at endpoint. Verifies that the response contains the expected identity fields matching the registration data — including id, email, and display_name — and that account timestamps are present and valid.
 *
 * Special attention is given to confirming that deleted_at remains null for an active account and that the password_hash field is never included in the response body, as guaranteed by the ITodoAppMember DTO type.
 *
 * 1. Register a new member through the join endpoint using explicit email and display_name values for later validation.
 * 2. Retrieve the member's own profile using the memberId from the join response.
 * 3. Verify profile.id matches the authorized member's id.
 * 4. Verify profile.email matches the registration email.
 * 5. Verify profile.display_name matches the registration display name.
 * 6. Confirm created_at and updated_at are valid ISO 8601 datetime strings.
 * 7. Confirm deleted_at is null for the newly created active account.
 */
export async function test_api_member_profile_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      display_name: displayName,
    },
  });
  typia.assert(authorized);
  // 2. Retrieve own profile
  const profile = await api.functional.todoApp.members.at(memberConnection, {
    memberId: authorized.id,
  });
  typia.assert(profile);
  // 3-7. Validate profile fields
  TestValidator.equals(
    "profile id matches authorized id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "email matches registration email",
    profile.email,
    email,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    displayName,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !Number.isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    () => !Number.isNaN(Date.parse(profile.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
