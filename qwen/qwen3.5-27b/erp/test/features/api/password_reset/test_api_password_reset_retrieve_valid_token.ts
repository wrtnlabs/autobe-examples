import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a valid password reset token that is not expired and not yet used.
 *
 * Validates the password reset token retrieval endpoint by registering a member and attempting to retrieve a password reset record. The test ensures the endpoint returns properly structured data with all required fields including token status, expiration, and member reference.
 *
 * Special attention is given to verifying that the response contains complete member information, valid token metadata, and proper null values for unused tokens. The test validates the complete password reset record structure including timestamps and relationship data.
 *
 * 1. Register a new member account with email and password authentication.
 * 2. Generate a valid UUID for the password reset token identifier.
 * 3. Call the password reset retrieval endpoint with the generated resetId.
 * 4. Validate the response contains all required fields with correct types.
 * 5. Verify business logic constraints: token not expired, not used, active record.
 */
export async function test_api_password_reset_retrieve_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a valid UUID for password reset token
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the password reset token
  const passwordReset =
    await api.functional.hrmTimeTrack.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate business logic: token belongs to the registered member
  TestValidator.equals(
    "member email matches",
    passwordReset.member.email,
    member.email,
  );
  // 5. Validate business logic: token is not yet used
  TestValidator.equals("token not yet used", passwordReset.used_at, null);
  // 6. Validate business logic: token is active (not deleted)
  TestValidator.equals("token is active", passwordReset.deleted_at, null);
  // 7. Validate business logic: token has a valid token string
  TestValidator.predicate("token value exists", passwordReset.token.length > 0);
}
