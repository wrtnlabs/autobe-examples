import { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderation_reports_resolution(
  input?:
    | DeepPartial<ICommunityPlatformModerationReportsResolution.ICreate>
    | undefined,
): ICommunityPlatformModerationReportsResolution.ICreate {
  input;
  return {};
}
