import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformActivity";
export function prepare_random_reddit_platform_activity(
  input?: DeepPartial<IRedditPlatformActivity.ICreate>,
): IRedditPlatformActivity.ICreate {
  return {
    type:
      input?.type ??
      RandomGenerator.pick([
        "post",
        "comment",
        "vote",
        "subscription",
        "login",
        "karma",
        "report",
      ] as const),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
    metadata:
      input?.metadata ??
      JSON.stringify({
        activityType:
          input?.type ??
          RandomGenerator.pick([
            "post",
            "comment",
            "vote",
            "subscription",
            "login",
            "karma",
            "report",
          ] as const),
        context: {
          id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
        },
      }),
  };
}
