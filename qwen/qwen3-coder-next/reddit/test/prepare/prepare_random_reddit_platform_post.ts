import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_post(
  input?: DeepPartial<IRedditPlatformPost.ICreate>,
): IRedditPlatformPost.ICreate {
  const type =
    input?.type ?? RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    type: type,
    content:
      input?.content ??
      (type === "TEXT" ? RandomGenerator.content({ paragraphs: 2 }) : null),
    url:
      input?.url ??
      (type === "LINK"
        ? (RandomGenerator.paragraph({ sentences: 1 }) as string &
            tags.Format<"uri">)
        : null),
    imageUrl:
      input?.imageUrl ??
      (type === "IMAGE"
        ? (RandomGenerator.paragraph({ sentences: 1 }) as string &
            tags.Format<"uri">)
        : null),
  };
}
