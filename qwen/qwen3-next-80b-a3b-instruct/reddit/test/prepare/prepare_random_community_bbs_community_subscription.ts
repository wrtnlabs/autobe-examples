import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
export function prepare_random_community_bbs_community_subscription(
  input?: DeepPartial<ICommunityBbsCommunitySubscription.ICreate> | undefined,
): ICommunityBbsCommunitySubscription.ICreate {
  return {
    community_id: typia.random<string & tags.Format<"uuid">>(),
  };
}
