import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_community_report(
  input?: DeepPartial<IRedditCloneCommunityReport.ICreate>,
): IRedditCloneCommunityReport.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
    target_type:
      input?.target_type ?? RandomGenerator.pick(["comment", "post"] as const),
  };
}
