import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_post(
  input?: DeepPartial<IRedditCommunityPost.ICreate> | undefined,
): IRedditCommunityPost.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    content:
      input?.content ??
      (Math.random() > 0.5
        ? RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 15,
          })
        : null),
    url:
      input?.url ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uri">>()
        : null),
    image_url:
      input?.image_url ??
      (Math.random() > 0.5
        ? typia.random<string & tags.Format<"uri">>()
        : null),
  };
}
