import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_content_report(
  input?: DeepPartial<IRedditCloneContentReport.ICreate>,
): IRedditCloneContentReport.ICreate {
  return {
    report_type:
      input?.report_type ?? RandomGenerator.pick(["post", "comment"] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    post_id: input?.post_id ?? null,
    comment_id: input?.comment_id ?? null,
  };
}
