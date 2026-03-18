import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report(
  input?: DeepPartial<ICommunityPlatformReport.ICreate> | undefined,
): ICommunityPlatformReport.ICreate {
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    targetType:
      input?.targetType ??
      (RandomGenerator.pick(["post", "comment"] as const) as string &
        tags.MinLength<1>),
    targetId: input?.targetId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
