import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_member_password_reset } from "../prepare/prepare_random_reddit_platform_member_password_reset";

/**
 * Generate a random password reset token for a Reddit member account via the API for E2E testing.
 *
 * Prepares random password reset creation data using the prepare function with a random email
 * address, then calls the password reset creation endpoint to generate a secure one-time-use
 * token. The token is cryptographically generated, linked to the member account (if found),
 * and returned with expiration information.
 *
 * This generation function tests the forgot password flow by creating a password reset token
 * that would typically be sent to the user's email address. The endpoint returns success
 * regardless of whether the email exists in the system, preventing email enumeration attacks.
 */
export async function generate_random_reddit_platform_member_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformMemberPasswordReset.ICreate>;
  },
): Promise<IRedditPlatformMemberPasswordReset> {
  const prepared: IRedditPlatformMemberPasswordReset.ICreate =
    prepare_random_reddit_platform_member_password_reset(props.body);
  const result: IRedditPlatformMemberPasswordReset =
    await api.functional.redditPlatform.member.password_resets.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
