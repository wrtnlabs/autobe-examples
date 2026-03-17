import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_text(
  input?: DeepPartial<ICommunityPlatformPostText.ICreate>,
): ICommunityPlatformPostText.ICreate {
  return {
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 16,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
