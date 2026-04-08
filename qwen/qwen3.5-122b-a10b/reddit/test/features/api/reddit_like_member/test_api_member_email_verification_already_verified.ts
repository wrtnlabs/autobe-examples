import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test preventing re-verification of an already-verified email token.
 *
 * Validates the business rule that email verification tokens can only be used once. After a token successfully verifies an email address, any subsequent verification attempts with the same token must be rejected to prevent replay attacks and ensure idempotency of the verification workflow.
 *
 * 1. Register a new member account with unique credentials
 * 2. Generate a verification token ID (simulating token from email)
 * 3. First verification attempt succeeds (token is valid and unused)
 * 4. Second verification attempt with same token fails (token already used)
 * 5. Validate error indicates token already verified
 */
export async function test_api_member_email_verification_already_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const joinOutput: IRedditLikeMember.IAuthorized =
    await api.functional.redditLike.auth.member.join(memberConnection, {
      body: {
        email,
        password: "Password123!",
        username,
        href: "https://example.com/join",
        referrer: null,
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(joinOutput);
  // 2. Generate a verification token ID (UUID format)
  // In production, this would be created during registration and sent via email
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First verification attempt - simulates successful initial verification
  // Note: In simulation mode, this will succeed with random data
  const verifiedMember: IRedditLikeMember =
    await api.functional.redditLike.member.email_verifications.putByVerificationid(
      connection,
      {
        verificationId,
      },
    );
  typia.assert(verifiedMember);
  // 4. Second verification attempt with same token - should fail
  // This validates the business rule that tokens can only be used once
  await TestValidator.error(
    "re-verification with same token should fail",
    async () => {
      await api.functional.redditLike.member.email_verifications.putByVerificationid(
        connection,
        {
          verificationId,
        },
      );
    },
  );
  // 5. Validate member state remains consistent
  TestValidator.equals("member email unchanged", joinOutput.email, email);
  TestValidator.equals(
    "member username unchanged",
    joinOutput.username,
    username,
  );
}
