import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform banned user creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformBannedUser.ICreate with randomized values.
 * The function creates a ban record that can be used to test user restriction
 * scenarios in the Reddit community moderation system.
 *
 * @param input - Optional DeepPartial for test-time customization
 * @returns Complete IRedditPlatformBannedUser.ICreate with all properties populated
 */
export function prepare_random_reddit_platform_banned_user(
  input?: DeepPartial<IRedditPlatformBannedUser.ICreate>,
): IRedditPlatformBannedUser.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    expiration_date:
      input?.expiration_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
