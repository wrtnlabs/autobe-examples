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
import { generate_random_reddit_platform_member_password_resets_create } from "../../../generate/generate_random_reddit_platform_member_password_resets_create";
import { prepare_random_reddit_platform_member_password_reset } from "../../../prepare/prepare_random_reddit_platform_member_password_reset";

/**
 * Test password reset token creation when email address does not exist in system (security edge case).
 *
 * Validates that the password reset endpoint returns success even when the email address is not found in the system. This security feature prevents attackers from enumerating valid email addresses by observing different responses for existing vs. non-existing emails.
 *
 * 1. A member account is created and authenticated to have an active session.
 * 2. The authenticated member sends a password reset request with an email address that does NOT exist in the system.
 * 3. The endpoint returns HTTP 200 OK with a valid password reset token record.
 * 4. Response validation confirms all required fields are present, member_id is null, and the token expiration is set correctly.
 */
export async function test_api_member_password_reset_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member to have an active session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create password reset request with non-existent email
  const nonExistentEmail =
    typia.random<string & tags.Format<"email">>() + "_nonexistent";
  const resetConnection: api.IConnection = { host: connection.host };
  const passwordReset =
    await api.functional.redditPlatform.member.password_resets.create(
      resetConnection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IRedditPlatformMemberPasswordReset.ICreate,
      },
    );
  typia.assert(passwordReset);
  // 3. Validate response structure
  TestValidator.equals("member_id is null", passwordReset.member_id, null);
  TestValidator.notEquals("id exists", passwordReset.id, null);
  TestValidator.notEquals("token exists", passwordReset.token, null);
  TestValidator.notEquals("used_at is null", passwordReset.used_at, null);
  TestValidator.notEquals("expires_at exists", passwordReset.expires_at, null);
  TestValidator.notEquals("created_at exists", passwordReset.created_at, null);
  TestValidator.notEquals("updated_at exists", passwordReset.updated_at, null);
  // 4. Validate expiration is exactly 1 hour after created_at
  const createdTime = new Date(passwordReset.created_at);
  const expiresTime = new Date(passwordReset.expires_at);
  const diffSeconds = Math.round(
    (expiresTime.getTime() - createdTime.getTime()) / 1000,
  );
  TestValidator.equals(
    "expires_at is 1 hour after created_at",
    diffSeconds,
    3600,
  );
}