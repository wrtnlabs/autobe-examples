import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_post(
  input?: DeepPartial<IRedditPlatformPost.ICreate>,
): IRedditPlatformPost.ICreate {
  const postType =
    input?.postType ?? RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 6, wordMax: 10 }),
    postType: postType,
    redditPlatformCommunityId:
      input?.redditPlatformCommunityId ??
      typia.random<string & tags.Format<"uuid">>(),
    content:
      input?.content ??
      (postType === "TEXT"
        ? RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 5,
            wordMax: 12,
          })
        : null),
    url:
      input?.url ??
      (postType === "LINK"
        ? typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>()
        : null),
    imageUrl:
      input?.imageUrl ??
      (postType === "IMAGE"
        ? typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>()
        : null),
  };
}
