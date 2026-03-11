import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_post_revision(
  input?: DeepPartial<IRedditLikePostRevision.ICreate> | undefined,
): IRedditLikePostRevision.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    content:
      input?.content !== undefined
        ? input.content
        : Math.random() > 0.3
          ? RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 2,
              sentenceMax: 5,
              wordMin: 3,
              wordMax: 8,
            })
          : null,
    url:
      input?.url !== undefined
        ? input.url
        : Math.random() > 0.4
          ? typia.random<string & tags.Format<"uri">>()
          : null,
    imageUrl:
      input?.imageUrl !== undefined
        ? input.imageUrl
        : Math.random() > 0.4
          ? typia.random<string & tags.Format<"uri">>()
          : null,
  };
}
