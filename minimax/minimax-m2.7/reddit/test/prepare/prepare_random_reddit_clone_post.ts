import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_post(
  input?: DeepPartial<IRedditClonePost.ICreate>,
): IRedditClonePost.ICreate {
  const type =
    input?.type ?? RandomGenerator.pick(["text", "link", "image"] as const);
  return {
    ...(type === "text"
      ? {
          body: input?.body ?? RandomGenerator.paragraph({ sentences: 3 }),
          url: input?.url,
          fileId: input?.fileId,
        }
      : type === "link"
        ? {
            body: input?.body,
            url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
            fileId: input?.fileId,
          }
        : {
            body: input?.body,
            url: input?.url,
            fileId:
              input?.fileId ?? typia.random<string & tags.Format<"uuid">>(),
          }),
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
    type,
  };
}
