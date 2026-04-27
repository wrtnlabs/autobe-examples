import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform ban creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformBan.ICreate with randomized values.
 * The function accepts an optional DeepPartial input allowing test authors to
 * override specific properties while defaulting to randomly generated values
 * for unspecified fields. This supports flexible test scenarios from fully
 * customized data to purely random fixtures.
 *
 * The generated data includes:
 * - A valid UUID identifying the member to be banned
 * - A realistic reason string explaining the ban's justification
 *
 * @param input Optional partial data to customize specific properties
 * @returns A fully populated ICommunityPlatformBan.ICreate instance
 */
export function prepare_random_community_platform_ban(
  input?: DeepPartial<ICommunityPlatformBan.ICreate> | undefined,
): ICommunityPlatformBan.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
