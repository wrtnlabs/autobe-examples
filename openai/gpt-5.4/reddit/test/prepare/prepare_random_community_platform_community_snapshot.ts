import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_snapshot(
  input?: DeepPartial<ICommunityPlatformCommunitySnapshot.ICreate>,
): ICommunityPlatformCommunitySnapshot.ICreate {
  return {
    visibility:
      input?.visibility ??
      RandomGenerator.pick([
        "public",
        "private",
        "members_only",
        "internal",
      ] as const),
  };
}
