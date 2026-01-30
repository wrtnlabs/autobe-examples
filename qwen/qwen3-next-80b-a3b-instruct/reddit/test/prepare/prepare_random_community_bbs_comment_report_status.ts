import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReportStatus";
export function prepare_random_community_bbs_comment_report_status(
  input?: DeepPartial<ICommunityBbsCommentReportStatus.ICreate> | undefined,
): ICommunityBbsCommentReportStatus.ICreate {
  return {
    status_name:
      input?.status_name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
  };
}
