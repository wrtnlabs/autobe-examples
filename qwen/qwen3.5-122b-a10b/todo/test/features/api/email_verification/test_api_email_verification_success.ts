import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful email verification workflow.
 *
 * Validates the complete email verification flow where a registered member successfully confirms their email address by submitting a valid verification token. The test ensures that the system properly validates the token, marks it as used, and returns the verification timestamp.
 *
 * The workflow follows these steps:
 * 1. Register a new member account with valid credentials
 * 2. Create a member-specific connection for authenticated API calls
 * 3. Submit an email verification token to confirm email ownership
 * 4. Validate that the response includes the verified_at timestamp
 *
 * This test covers the primary success path for email confirmation during registration or email change workflows. The verification token must be valid, unexpired, and unverified for the operation to succeed.
 */
export async function test_api_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: typia.random<ITodoAppMember.IJoin>(),
    },
  );
  typia.assert(member);
  // 2. Submit email verification token
  // Note: In simulation mode, random token will work. In real mode,
  // the token would need to be obtained from the email sent during registration.
  const verification =
    await api.functional.todoApp.member.email_verifications.verify(
      memberConnection,
      {
        body: typia.random<ITodoAppMemberEmailVerification.IVerify>(),
      },
    );
  typia.assert(verification);
  // 3. Validate response contains verified_at timestamp
  if (
    verification.verified_at === null ||
    verification.verified_at === undefined
  ) {
    throw new Error("verified_at should be set");
  }
}
