import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_comment(
  input?: DeepPartial<IRedditPlatformComment.ICreate>,
): IRedditPlatformComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
    post_id: input?.post_id ?? typia.random<string & tags.Format<"uuid">>(),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
