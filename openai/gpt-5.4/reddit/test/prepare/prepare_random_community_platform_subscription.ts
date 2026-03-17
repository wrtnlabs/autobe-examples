import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_subscription(
  input?: DeepPartial<ICommunityPlatformSubscription.ICreate>,
): ICommunityPlatformSubscription.ICreate {
  return {
    community_slug:
      input?.community_slug ??
      `${RandomGenerator.alphabets(6)}-${RandomGenerator.alphabets(8)}`,
  };
}
