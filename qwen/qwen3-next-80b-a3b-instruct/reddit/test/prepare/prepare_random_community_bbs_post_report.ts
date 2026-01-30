import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
export function prepare_random_community_bbs_post_report(
  input?: DeepPartial<ICommunityBbsPostReport.ICreate>,
): ICommunityBbsPostReport.ICreate {
  return {
    target_post_id:
      input?.target_post_id ?? typia.random<string & tags.Format<"uuid">>(),
    selected_violation_category_id:
      input?.selected_violation_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    comment:
      input?.comment ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<7>
        >(),
        wordMin: 2,
        wordMax: 8,
      }),
  };
}
