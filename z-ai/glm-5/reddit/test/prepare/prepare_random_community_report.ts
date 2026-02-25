import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_report(
  input?: DeepPartial<ICommunityReport.ICreate>,
): ICommunityReport.ICreate {
  return {
    content_type:
      input?.content_type ?? RandomGenerator.pick(["POST", "COMMENT"] as const),
    content_id:
      input?.content_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 5 }),
  };
}
