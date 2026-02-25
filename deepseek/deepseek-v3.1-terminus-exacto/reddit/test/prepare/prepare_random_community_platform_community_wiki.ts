import { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_wiki(
  input?: DeepPartial<ICommunityPlatformCommunityWiki.ICreate>,
): ICommunityPlatformCommunityWiki.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: input?.slug ?? RandomGenerator.alphaNumeric(10).toLowerCase(),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 6,
        wordMin: 5,
        wordMax: 12,
      }),
    status:
      input?.status ??
      RandomGenerator.pick(["draft", "published", "archived"] as const),
  };
}
