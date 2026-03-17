import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_report(
  input?: DeepPartial<IRedditLikeReport.ICreate>,
): IRedditLikeReport.ICreate {
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    postId: input?.postId ?? typia.random<string & tags.Format<"uuid">>(),
    commentId: input?.commentId ?? null,
  };
}
