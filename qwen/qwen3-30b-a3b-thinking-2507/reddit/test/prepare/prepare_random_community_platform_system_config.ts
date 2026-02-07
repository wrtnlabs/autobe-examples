import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_system_config(
  input?: DeepPartial<ICommunityPlatformSystemConfig.ICreate>,
): ICommunityPlatformSystemConfig.ICreate {
  return {
    key: input?.key ?? RandomGenerator.alphabets(10).toUpperCase(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    type:
      input?.type ??
      RandomGenerator.pick(["int", "boolean", "string", "duration"] as const),
    value: input?.value
      ? input.value
      : (() => {
          const t =
            input?.type ??
            RandomGenerator.pick([
              "int",
              "boolean",
              "string",
              "duration",
            ] as const);
          switch (t) {
            case "int":
              return typia
                .random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<1000>
                >()
                .toString();
            case "boolean":
              return typia.random<boolean>() ? "true" : "false";
            case "duration":
              return `PT${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>()}H${typia.random<number & tags.Type<"uint32"> & tags.Maximum<60>>()}M`;
            default:
              return RandomGenerator.paragraph({ sentences: 3 });
          }
        })(),
    is_active: input?.is_active ?? true,
  };
}
