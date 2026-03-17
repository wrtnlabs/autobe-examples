import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community(
  input?: DeepPartial<ICommunityPlatformCommunity.ICreate> | undefined,
): ICommunityPlatformCommunity.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 1, wordMax: 3 }),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 3,
          }),
  };
}
