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
    slug:
      input?.slug ??
      `${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(6)}`,
    title: input?.title ?? `${RandomGenerator.name(2)} Community`,
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 8, wordMin: 3, wordMax: 8 }),
  };
}
