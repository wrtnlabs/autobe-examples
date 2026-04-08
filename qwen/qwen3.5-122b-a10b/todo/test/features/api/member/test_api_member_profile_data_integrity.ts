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
 * Test member profile data integrity and completeness validation.
 *
 * Validates that the member profile endpoint returns accurate and complete data conforming to the ITodoAppMember schema. The test ensures all required fields are present with correct formats, timestamps maintain logical ordering, and no sensitive data is exposed beyond the schema definition.
 *
 * The test follows a complete authentication flow: member registration, profile retrieval, and comprehensive data validation including format checks, temporal consistency, and schema compliance verification.
 *
 * 1. Register a new member account with randomized credentials including email, password, and display name.
 * 2. Retrieve the member's profile using the authenticated connection from registration.
 * 3. Validate the response conforms to ITodoAppMember schema using typia.assert.
 * 4. Validate id field is in valid UUID format.
 * 5. Validate email matches the registration email exactly.
 * 6. Validate display_name is present and non-empty string.
 * 7. Validate created_at timestamp is earlier than or equal to updated_at.
 * 8. Validate both created_at and updated_at are in the past (account creation time).
 * 9. Validate deleted_at is null for active accounts.
 * 10. Verify no additional fields beyond ITodoAppMember schema are present.
 */
export async function test_api_member_profile_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const registrationConnection: api.IConnection = { host: connection.host };
  const registrationResult = await authorize_member_join(
    registrationConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(registrationResult);
  // 2. Create profile connection using registration token
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    Authorization: `Bearer ${registrationResult.token.access}`,
  };
  // 3. Retrieve member profile
  const profile =
    await api.functional.todoApp.member.profile.at(profileConnection);
  typia.assert(profile);
  // 4. Validate id is UUID format
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  // 5. Validate email matches registration
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registrationResult.email,
  );
  // 6. Validate display_name is present and non-empty
  TestValidator.predicate(
    "display_name is non-empty",
    profile.display_name.length > 0,
  );
  // 7. Validate created_at <= updated_at
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);
  TestValidator.predicate(
    "created_at <= updated_at",
    createdAt.getTime() <= updatedAt.getTime(),
  );
  // 8. Validate timestamps are in the past
  const now = new Date();
  TestValidator.predicate(
    "created_at is in the past",
    createdAt.getTime() <= now.getTime(),
  );
  TestValidator.predicate(
    "updated_at is in the past",
    updatedAt.getTime() <= now.getTime(),
  );
  // 9. Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // 10. Verify no extra fields beyond schema
  const expectedKeys: ReadonlyArray<keyof ITodoAppMember> = [
    "id",
    "email",
    "display_name",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const actualKeys = Object.keys(profile) as ReadonlyArray<
    keyof ITodoAppMember
  >;
  TestValidator.equals(
    "field count matches schema",
    actualKeys.length,
    expectedKeys.length,
  );
  for (const key of actualKeys) {
    TestValidator.predicate(
      `field ${String(key)} exists in schema`,
      expectedKeys.includes(key),
    );
  }
}
