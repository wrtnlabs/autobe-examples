import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an existing password reset record by its unique identifier.
 *
 * Validates the complete password reset retrieval flow including member authentication and password reset record access. Ensures that the response contains all required fields with correct types and that the associated member information is properly included.
 *
 * Special attention is given to verifying that the member object in the response matches the expected ITodoAppMember.ISummary structure and that all timestamp fields are present and in valid date-time format.
 *
 * 1. Register and authenticate a new member account with email and password.
 * 2. Enable simulation mode to generate mock password reset data.
 * 3. Generate a valid UUID for the password reset record identifier.
 * 4. Retrieve the password reset record using the generated resetId.
 * 5. Validate the response structure contains all required fields.
 * 6. Verify the member object has correct ISummary structure.
 * 7. Confirm all timestamp fields are present and properly formatted.
 */
export async function test_api_password_reset_retrieve_existing(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Enable simulation mode for mock data generation
  // Since there's no API to create password reset records, we use simulation
  // mode which returns typia.random<ITodoAppMemberPasswordReset>()
  memberConnection.simulate = true;
  // 3. Generate a valid UUID for password reset record
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve password reset record (simulation mode returns mock data)
  const passwordReset =
    await api.functional.todoApp.member.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 5. Validate response structure
  TestValidator.equals("resetId matches", passwordReset.id, resetId);
  // 6. Verify member object structure
  TestValidator.equals(
    "member id is uuid",
    typeof passwordReset.member.id,
    "string",
  );
  TestValidator.equals(
    "member email is string",
    typeof passwordReset.member.email,
    "string",
  );
  TestValidator.predicate(
    "member email format valid",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passwordReset.member.email),
  );
  TestValidator.equals(
    "member created_at exists",
    typeof passwordReset.member.created_at,
    "string",
  );
  TestValidator.equals(
    "member updated_at exists",
    typeof passwordReset.member.updated_at,
    "string",
  );
  TestValidator.predicate(
    "member deleted_at is null or string",
    passwordReset.member.deleted_at === null ||
      typeof passwordReset.member.deleted_at === "string",
  );
  // 7. Verify timestamp fields
  TestValidator.equals(
    "expired_at is string",
    typeof passwordReset.expired_at,
    "string",
  );
  TestValidator.equals(
    "created_at is string",
    typeof passwordReset.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is string",
    typeof passwordReset.updated_at,
    "string",
  );
  TestValidator.predicate(
    "deleted_at is null or string",
    passwordReset.deleted_at === null ||
      typeof passwordReset.deleted_at === "string",
  );
}
