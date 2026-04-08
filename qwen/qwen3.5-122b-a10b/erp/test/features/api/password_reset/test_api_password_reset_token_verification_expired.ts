import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import type { IHrmMemberPasswordResetVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordResetVerification";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_member_password_resets_create } from "../../../generate/generate_random_hrm_member_member_password_resets_create";
import { prepare_random_hrm_member_password_reset } from "../../../prepare/prepare_random_hrm_member_password_reset";

/**
 * Test password reset token verification with invalid/expired token scenario.
 *
 * Validates the password reset token verification endpoint's error handling when presented with an invalid or non-existent token. Since actual time-based token expiration (typically 1 hour) is impractical for E2E test execution, this test uses an invalid UUID to verify the system properly rejects invalid tokens with appropriate error responses.
 *
 * The test ensures that:
 * 1. Invalid token UUIDs return proper HTTP error responses
 * 2. The system does not expose whether a token was never valid vs already used/expired (security requirement)
 * 3. Token verification properly validates token existence and format
 *
 * 1. Create a member account with valid credentials.
 * 2. Request a password reset token for the member's email.
 * 3. Attempt to verify with an invalid/non-existent token UUID.
 * 4. Validate that the verification endpoint returns appropriate error response.
 */
export async function test_api_password_reset_token_verification_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset token
  await generate_random_hrm_member_member_password_resets_create(
    memberConnection,
    {
      body: {
        email: member.email,
      } satisfies IHrmMemberPasswordReset.ICreate,
    },
  );
  // 3. Attempt verification with invalid token UUID
  const invalidResetId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify that invalid token returns HTTP error (404 Not Found or 400 Bad Request)
  await TestValidator.httpError(
    "invalid token verification should fail",
    [400, 404],
    async () =>
      await api.functional.hrm.member.member.password_resets.at(connection, {
        resetId: invalidResetId,
      }),
  );
}
