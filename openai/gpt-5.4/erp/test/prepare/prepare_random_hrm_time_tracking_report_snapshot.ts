import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_report_snapshot(
  input?: DeepPartial<IHrmTimeTrackingReportSnapshot.ICreate>,
): IHrmTimeTrackingReportSnapshot.ICreate {
  return {
    output_uri:
      input?.output_uri ??
      `https://storage.example.com/hrm/time-tracking/reports/${RandomGenerator.alphaNumeric(12)}.${RandomGenerator.pick(["csv", "xlsx", "pdf", "json"] as const)}`,
    output_format:
      input?.output_format ??
      RandomGenerator.pick(["csv", "xlsx", "pdf", "json"] as const),
    period_start:
      input?.period_start ?? typia.random<string & tags.Format<"date-time">>(),
    period_end:
      input?.period_end ?? typia.random<string & tags.Format<"date-time">>(),
    row_count:
      input && "row_count" in input
        ? input.row_count
        : RandomGenerator.pick([true, false] as const)
          ? null
          : typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    generated_at:
      input?.generated_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
