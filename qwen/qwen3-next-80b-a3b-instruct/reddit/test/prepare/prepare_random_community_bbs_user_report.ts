import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
export function prepare_random_community_bbs_user_report(
  input?: DeepPartial<ICommunityBbsUserReport.ICreate>,
): ICommunityBbsUserReport.ICreate {
  return {
    reported_user_id:
      input?.reported_user_id ?? typia.random<string & tags.Format<"uuid">>(),
    violation_category_id:
      input?.violation_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    custom_description:
      input?.custom_description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      }),
  };
}
