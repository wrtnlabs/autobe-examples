import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_post(
  input?: DeepPartial<IRedditCommunityPost.ICreate>,
): IRedditCommunityPost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
    post_type:
      input?.post_type ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    body:
      input?.body ??
      (input?.post_type === "text" || !input?.post_type
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined),
    url:
      input?.url ??
      (input?.post_type === "link" || !input?.post_type
        ? typia.random<string & tags.Format<"url">>()
        : undefined),
    fileId:
      input?.fileId ??
      (input?.post_type === "image" || !input?.post_type
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined),
  };
}
