import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community(
  input?: DeepPartial<ICommunityPlatformCommunity.ICreate>,
): ICommunityPlatformCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphaNumeric(12),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 5 }),
    icon:
      input?.icon !== undefined
        ? input.icon
        : typia.random<string & tags.Format<"url">>(),
  };
}
