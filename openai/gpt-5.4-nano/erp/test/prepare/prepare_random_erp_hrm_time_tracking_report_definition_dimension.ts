import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_report_definition_dimension(
  input?:
    | DeepPartial<IErpHrmTimeTrackingReportDefinitionDimension.ICreate>
    | undefined,
): IErpHrmTimeTrackingReportDefinitionDimension.ICreate {
  return {
    dimension_key: input?.dimension_key ?? RandomGenerator.alphaNumeric(12),
    dimension_label: input?.dimension_label ?? RandomGenerator.name(3),
    sort_order:
      input?.sort_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
