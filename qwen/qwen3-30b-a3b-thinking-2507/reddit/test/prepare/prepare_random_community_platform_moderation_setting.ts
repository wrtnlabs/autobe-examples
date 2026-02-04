import { ICommunityPlatformModerationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderation_setting(
  input?: DeepPartial<ICommunityPlatformModerationSetting.ICreate>,
): ICommunityPlatformModerationSetting.ICreate {
  return {
    feature:
      input?.feature ??
      RandomGenerator.pick(["bans", "reports", "content_removal"] as const),
    status:
      input?.status ?? RandomGenerator.pick(["active", "inactive"] as const),
    configuration: input?.configuration ?? {
      banDuration: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<30>
      >(),
      reportingWorkflow: RandomGenerator.pick([
        "direct",
        "review",
        "escalate",
      ] as const),
      contentRemovalThreshold: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
      >(),
    },
    reasons:
      input?.reasons ??
      (input?.feature === "bans"
        ? ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            () =>
              RandomGenerator.paragraph({
                sentences: typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<3>
                >(),
              }),
          )
        : []),
  };
}
