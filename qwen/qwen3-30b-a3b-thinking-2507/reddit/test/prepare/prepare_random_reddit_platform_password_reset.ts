import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPasswordReset";

export function prepare_random_reddit_platform_password_reset(
  input?: DeepPartial<IRedditPlatformPasswordReset.ICreate>,
): IRedditPlatformPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
  };
}