import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_report(
  input?: DeepPartial<IRedditCloneReport.ICreate> | undefined,
): IRedditCloneReport.ICreate {
  return {
    content_type:
      input?.content_type ?? RandomGenerator.pick(["post", "comment"] as const),
    reason:
      input?.reason ??
      typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
    post_id: input?.post_id ?? typia.random<string & tags.Format<"uuid">>(),
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
