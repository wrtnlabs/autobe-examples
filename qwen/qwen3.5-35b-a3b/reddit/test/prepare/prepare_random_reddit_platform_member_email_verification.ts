import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform member email verification data for E2E testing.
 *
 * Generates a complete IRedditPlatformMemberEmailVerification.ICreate with randomized
 * member ID and email address. Useful for testing email verification token generation
 * and validation workflows.
 *
 * @param input - Optional DeepPartial for test customization, allows overriding specific fields
 * @returns Complete IRedditPlatformMemberEmailVerification.ICreate with randomized values
 */
export function prepare_random_reddit_platform_member_email_verification(
  input?: DeepPartial<IRedditPlatformMemberEmailVerification.ICreate>,
): IRedditPlatformMemberEmailVerification.ICreate {
  return {
    reddit_platform_member_id:
      input?.reddit_platform_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}
