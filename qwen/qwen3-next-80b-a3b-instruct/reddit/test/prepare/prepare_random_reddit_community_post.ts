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
      RandomGenerator.paragraph({ sentences: RandomGenerator.pick([1, 2, 3]) }),
    communityName: input?.communityName ?? RandomGenerator.name(2),
    textContent:
      input?.textContent ??
      (input?.url !== undefined || input?.imageUrl !== undefined
        ? undefined
        : RandomGenerator.content({
            paragraphs: RandomGenerator.pick([1, 2, 3]),
            sentenceMin: 5,
            sentenceMax: 15,
          })),
    url:
      input?.url ??
      (input?.textContent !== undefined || input?.imageUrl !== undefined
        ? undefined
        : RandomGenerator.pick([
            "https://example.com",
            "https://github.com",
            "https://stackoverflow.com",
          ] as const)),
    imageUrl:
      input?.imageUrl ??
      (input?.textContent !== undefined || input?.url !== undefined
        ? undefined
        : RandomGenerator.pick([
            "https://example.com/image.jpg",
            "https://example.com/image.png",
            "https://example.com/image.webp",
          ] as const)),
  };
}