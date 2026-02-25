import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_report(
  input?: DeepPartial<ICommunityPlatformCommentReport.ICreate>,
): ICommunityPlatformCommentReport.ICreate {
  return {
    comment_id:
      input?.comment_id ?? typia.random<string & tags.Format<"uuid">>(),
    report_reason_id:
      input && Object.prototype.hasOwnProperty.call(input, "report_reason_id")
        ? (input.report_reason_id ?? null)
        : Math.random() < 0.5
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    description:
      input && Object.prototype.hasOwnProperty.call(input, "description")
        ? (input.description ?? null)
        : Math.random() < 0.5
          ? RandomGenerator.paragraph({ sentences: 3 })
          : null,
  };
}
