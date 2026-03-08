import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_report(
  input?: DeepPartial<IRedditLikeReport.ICreate>,
): IRedditLikeReport.ICreate {
  // Randomly decide which field to populate (reported_post_id or reported_comment_id)
  const populatePostId = Math.random() < 0.5;
  return {
    reported_post_id:
      input?.reported_post_id ??
      (populatePostId ? typia.random<string & tags.Format<"uuid">>() : null),
    reported_comment_id:
      input?.reported_comment_id ??
      (!populatePostId ? typia.random<string & tags.Format<"uuid">>() : null),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
