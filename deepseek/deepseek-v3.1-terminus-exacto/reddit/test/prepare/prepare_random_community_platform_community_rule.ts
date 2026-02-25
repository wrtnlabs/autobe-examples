import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_rule(
  input?: DeepPartial<ICommunityPlatformCommunityRule.ICreate>,
): ICommunityPlatformCommunityRule.ICreate {
  return {
    rule_text: input?.rule_text ?? RandomGenerator.paragraph({ sentences: 3 }),
    rule_order:
      input?.rule_order ?? typia.random<number & tags.Type<"int32">>(),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
  };
}
