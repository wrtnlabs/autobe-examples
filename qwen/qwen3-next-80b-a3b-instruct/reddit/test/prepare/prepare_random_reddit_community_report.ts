import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_report(
  input?: DeepPartial<IRedditCommunityReport.ICreate> | undefined,
): IRedditCommunityReport.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 50,
        wordMin: 2,
        wordMax: 15,
      }),
    postId:
      input?.postId ??
      (input?.commentId === undefined
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
    commentId:
      input?.commentId ??
      (input?.postId === undefined
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
