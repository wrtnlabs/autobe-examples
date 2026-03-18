import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_report_definition(
  input?: DeepPartial<IErpHrmTimeTrackingReportDefinition.ICreate> | undefined,
): IErpHrmTimeTrackingReportDefinition.ICreate {
  return {
    code: input?.code ?? typia.random<string & tags.Format<"uuid">>(),
    name: input?.name ?? RandomGenerator.name(3),
    description:
      input?.description ??
      (Math.random() < 0.3
        ? null
        : RandomGenerator.paragraph({ sentences: 2 })),
    report_type:
      input?.report_type ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-z_]+$">
      >(),
    is_active: input?.is_active ?? typia.random<boolean>(),
    definitionDimensions: input?.definitionDimensions
      ? input.definitionDimensions.map((dimension) => ({
          dimension_key:
            dimension.dimension_key ??
            typia.random<
              string &
                tags.MinLength<1> &
                tags.MaxLength<40> &
                tags.Pattern<"^[a-z0-9_]+$">
            >(),
          dimension_label: dimension.dimension_label ?? RandomGenerator.name(2),
          sort_order:
            dimension.sort_order ??
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
            >(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
          >(),
          () => ({
            dimension_key: typia.random<
              string &
                tags.MinLength<1> &
                tags.MaxLength<40> &
                tags.Pattern<"^[a-z0-9_]+$">
            >(),
            dimension_label: RandomGenerator.name(2),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
            >(),
          }),
        ),
    definitionFilters: input?.definitionFilters
      ? input.definitionFilters.map((filter) => ({
          field_key:
            filter.field_key ??
            typia.random<
              string &
                tags.MinLength<1> &
                tags.MaxLength<40> &
                tags.Pattern<"^[a-z0-9_]+$">
            >(),
          operator:
            filter.operator ??
            RandomGenerator.pick([
              "eq",
              "neq",
              "in",
              "not_in",
              "gte",
              "lte",
              "contains",
            ] as const),
          value_text: filter.value_text ?? RandomGenerator.alphabets(10),
          value_text_2:
            filter.value_text_2 ??
            (Math.random() < 0.4 ? RandomGenerator.alphabets(10) : null),
          is_enabled: filter.is_enabled ?? typia.random<boolean>(),
          display_order:
            filter.display_order ??
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
            >(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
          >(),
          () => ({
            field_key: typia.random<
              string &
                tags.MinLength<1> &
                tags.MaxLength<40> &
                tags.Pattern<"^[a-z0-9_]+$">
            >(),
            operator: RandomGenerator.pick([
              "eq",
              "neq",
              "in",
              "not_in",
              "gte",
              "lte",
              "contains",
            ] as const),
            value_text: RandomGenerator.alphabets(10),
            value_text_2: null,
            is_enabled: typia.random<boolean>(),
            display_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
            >(),
          }),
        ),
  };
}
