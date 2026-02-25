import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_feature_flag(
  input?: DeepPartial<ICommunityPlatformFeatureFlag.ICreate>,
): ICommunityPlatformFeatureFlag.ICreate {
  const flag_type =
    input?.flag_type ??
    RandomGenerator.pick(["boolean", "percentage", "user_specific"] as const);
  return {
    name: input?.name ?? RandomGenerator.alphabets(10),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    flag_type: flag_type,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "inactive", "archived"] as const),
    boolean_value:
      input?.boolean_value ??
      (flag_type === "boolean" ? typia.random<boolean>() : null),
    percentage_value:
      input?.percentage_value ??
      (flag_type === "percentage"
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >()
        : null),
  };
}
