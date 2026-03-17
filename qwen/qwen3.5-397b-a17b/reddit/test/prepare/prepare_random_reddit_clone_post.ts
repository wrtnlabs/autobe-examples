import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_post(
  input?: DeepPartial<IRedditClonePost.ICreate>,
): IRedditClonePost.ICreate {
  const post_type =
    input?.post_type ??
    RandomGenerator.pick(["TEXT", "LINK", "IMAGE"] as const);
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    post_type: post_type,
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    text:
      post_type === "TEXT"
        ? {
            body:
              input?.text?.body ?? RandomGenerator.content({ paragraphs: 2 }),
          }
        : null,
    link:
      post_type === "LINK"
        ? {
            url:
              input?.link?.url ?? typia.random<string & tags.Format<"uri">>(),
          }
        : null,
    image:
      post_type === "IMAGE"
        ? {
            fileUri:
              input?.image?.fileUri ??
              typia.random<string & tags.Format<"uri">>(),
          }
        : null,
  };
}
