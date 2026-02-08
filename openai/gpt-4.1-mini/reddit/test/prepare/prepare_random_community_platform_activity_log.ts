import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_activity_log(
  input?: DeepPartial<ICommunityPlatformActivityLog.ICreate> | undefined,
): ICommunityPlatformActivityLog.ICreate {
  input;
  return {};
}
