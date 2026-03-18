import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment(
  input?: DeepPartial<ICommunityPlatformComment.ICreate> | undefined,
): ICommunityPlatformComment.ICreate {
  return {
    community_platform_post_id:
      input?.community_platform_post_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_id:
      input?.parent_id === null
        ? null
        : (input?.parent_id ?? typia.random<string & tags.Format<"uuid">>()),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 5,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
