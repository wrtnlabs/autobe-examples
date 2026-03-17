import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_text(
  input?: DeepPartial<ICommunityPlatformPostText.ICreate> | undefined,
): ICommunityPlatformPostText.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
    formatting: input?.formatting ?? "plain",
  };
}
