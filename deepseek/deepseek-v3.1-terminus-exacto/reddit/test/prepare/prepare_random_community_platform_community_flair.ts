import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_flair(
  input?: DeepPartial<ICommunityPlatformCommunityFlair.ICreate>,
): ICommunityPlatformCommunityFlair.ICreate {
  return {
    display_text:
      input?.display_text ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 3,
        wordMin: 1,
        wordMax: 3,
      }),
    background_color:
      input?.background_color ??
      RandomGenerator.pick([
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#FFA500",
        "#800080",
        "#FFC0CB",
      ] as const),
    text_color:
      input?.text_color ??
      RandomGenerator.pick([
        "#FFFFFF",
        "#000000",
        "#333333",
        "#666666",
      ] as const),
    css_class: input?.css_class ?? RandomGenerator.alphabets(8),
    is_active: input?.is_active ?? typia.random<boolean>(),
  };
}
