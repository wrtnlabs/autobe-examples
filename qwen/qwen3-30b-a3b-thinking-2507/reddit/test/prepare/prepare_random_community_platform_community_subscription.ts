import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_subscription(
  input?: DeepPartial<ICommunityPlatformCommunitySubscription.ICreate>,
): ICommunityPlatformCommunitySubscription.ICreate {
  return {
    state: RandomGenerator.pick(["active", "inactive"] as const),
  };
}
