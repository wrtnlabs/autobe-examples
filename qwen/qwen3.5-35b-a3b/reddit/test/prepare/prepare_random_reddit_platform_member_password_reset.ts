import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform member password reset creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformMemberPasswordReset.ICreate with randomized email
 * address for testing password reset flow. The email format is validated by typia's
 * Format<"email"> constraint, ensuring it conforms to RFC 5322 standards.
 *
 * The endpoint succeeds regardless of whether the email exists in the system, as
 * this prevents email enumeration attacks by returning consistent responses for
 * existing and non-existing emails.
 */
export function prepare_random_reddit_platform_member_password_reset(
  input?: DeepPartial<IRedditPlatformMemberPasswordReset.ICreate>,
): IRedditPlatformMemberPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
