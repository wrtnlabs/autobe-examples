import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_report_definition_filter(
  input?: DeepPartial<IErpHrmTimeTrackingReportDefinitionFilter.ICreate>,
): IErpHrmTimeTrackingReportDefinitionFilter.ICreate {
  return {
    field_key: input?.field_key ?? RandomGenerator.alphaNumeric(12),
    operator:
      input?.operator ??
      RandomGenerator.pick([
        "eq",
        "neq",
        "gt",
        "gte",
        "lt",
        "lte",
        "contains",
        "starts_with",
        "ends_with",
        "in",
      ] as const),
    value_text:
      input?.value_text ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 2,
        wordMin: 2,
        wordMax: 6,
      }),
    value_text_2:
      input?.value_text_2 !== undefined
        ? input.value_text_2
        : Math.random() < 0.5
          ? null
          : RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 1,
              sentenceMax: 2,
              wordMin: 2,
              wordMax: 6,
            }),
    is_enabled: input?.is_enabled ?? typia.random<boolean>(),
    display_order:
      input?.display_order ?? typia.random<number & tags.Type<"int32">>(),
  };
}
