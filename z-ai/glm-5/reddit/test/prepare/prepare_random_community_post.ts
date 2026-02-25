import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_post(
  input?: DeepPartial<ICommunityPost.ICreate>,
): ICommunityPost.ICreate {
  const post_type =
    input?.post_type ??
    RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    post_type,
    text_content:
      input?.text_content ??
      (post_type === "TEXT"
        ? RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 15,
          })
        : null),
    link_url:
      input?.link_url ??
      (post_type === "LINK"
        ? (typia.random<string & tags.Format<"uri">>() satisfies string as string)
        : null),
    image_url:
      input?.image_url ??
      (post_type === "IMAGE"
        ? (typia.random<string & tags.Format<"uri">>() satisfies string as string)
        : null),
  };
}
