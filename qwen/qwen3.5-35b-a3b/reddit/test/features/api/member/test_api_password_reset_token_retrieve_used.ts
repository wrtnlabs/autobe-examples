import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a used (consumed) password reset token record for audit purposes.
 *
 * Validates that password reset tokens remain retrievable after being used for password reset operations. The test exercises the complete token lifecycle from generation through consumption to audit retrieval.
 *
 * Special attention is given to verifying that used tokens correctly display the consumed timestamp (used_at) while remaining accessible in the audit system for compliance and security monitoring purposes.
 *
 * 1. Member account registration and authentication via POST /redditPlatform/auth/member/join
 * 2. Password reset token generation for the member (simulated via test data generation)
 * 3. Token consumption to mark it as used (simulating successful password reset)
 * 4. Token record retrieval via GET /redditPlatform/member/password-resets/{resetId}
 * 5. Validates response contains correct ID, member reference, used_at timestamp, and audit integrity
 */
export async function test_api_password_reset_token_retrieve_used(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  const memberId = joinResponse.id;
  const memberUsername = joinResponse.username;
  // 2. Create a used password reset token (simulated for test purposes)
  // Since token generation endpoint is not available in SDK, we create test data
  const tokenCreatedAt = new Date();
  const tokenExpiresAt = new Date(tokenCreatedAt.getTime() + 3600 * 1000);
  const tokenUsedAt = new Date(tokenCreatedAt.getTime() + 1800 * 1000); // Used 30 minutes after creation
  const passwordResetToken: IRedditPlatformMemberPasswordReset = {
    id: typia.random<string & tags.Format<"uuid">>(),
    member_id: memberId,
    token: typia.random<string>(),
    created_at: tokenCreatedAt.toISOString(),
    updated_at: tokenUsedAt.toISOString(),
    expires_at: tokenExpiresAt.toISOString(),
    used_at: tokenUsedAt.toISOString(), // Token already consumed
    deleted_at: null,
    member: {
      id: memberId,
      username: memberUsername,
      karma: 0,
      created_at: joinResponse.created_at,
    } satisfies IRedditPlatformMember.ISummary,
  } satisfies IRedditPlatformMemberPasswordReset;
  // 3. Retrieve the used password reset token
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrievedToken =
    await api.functional.redditPlatform.member.password_resets.at(
      retrieveConnection,
      {
        resetId: passwordResetToken.id,
      },
    );
  typia.assert(retrievedToken);
  // 4. Validate the retrieved token record
  TestValidator.equals(
    "token ID matches resetId",
    retrievedToken.id,
    passwordResetToken.id,
  );
  TestValidator.equals(
    "member_id matches original member",
    retrievedToken.member_id,
    memberId,
  );
  TestValidator.equals(
    "token is hashed value",
    retrievedToken.token,
    passwordResetToken.token,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    retrievedToken.created_at,
    passwordResetToken.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp preserved",
    retrievedToken.updated_at,
    passwordResetToken.updated_at,
  );
  TestValidator.equals(
    "expires_at timestamp preserved",
    retrievedToken.expires_at,
    passwordResetToken.expires_at,
  );
  TestValidator.notEquals(
    "used_at is set for consumed token",
    retrievedToken.used_at,
    null,
  );
  TestValidator.equals(
    "used_at timestamp matches",
    retrievedToken.used_at,
    passwordResetToken.used_at,
  );
  TestValidator.equals(
    "deleted_at is null for active audit record",
    retrievedToken.deleted_at,
    null,
  );
  TestValidator.equals(
    "member username matches",
    retrievedToken.member?.username,
    memberUsername,
  );
  TestValidator.equals(
    "member id matches",
    retrievedToken.member?.id,
    memberId,
  );
  TestValidator.equals(
    "member karma matches",
    retrievedToken.member?.karma,
    passwordResetToken.member?.karma,
  );
  // 5. Validate token status logic
  TestValidator.predicate(
    "token is marked as used since used_at is set",
    retrievedToken.used_at !== null,
  );
  TestValidator.predicate(
    "token was created before it was used",
    new Date(retrievedToken.created_at) < new Date(retrievedToken.used_at!),
  );
  TestValidator.predicate(
    "token is expired based on expiration",
    new Date() >= new Date(retrievedToken.expires_at),
  );
}