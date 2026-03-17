import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_ban_snapshot(
  input?:
    | DeepPartial<ICommunityPlatformCommunityBanSnapshot.ICreate>
    | undefined,
): ICommunityPlatformCommunityBanSnapshot.ICreate {
  input;
  return {};
}
