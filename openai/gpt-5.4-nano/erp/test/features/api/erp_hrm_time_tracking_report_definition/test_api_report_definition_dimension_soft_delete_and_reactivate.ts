import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_dimension_soft_delete_and_reactivate(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1) Create a report definition (parent)
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      userConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          name: RandomGenerator.name(),
          description: null,
          report_type: RandomGenerator.alphaNumeric(10),
          is_active: true,
          definitionDimensions: [],
          definitionFilters: [],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinition);
  // 2) Create a single dimension row under the report definition
  const dimensionKey = "dimension_key_soft_delete_test";
  const dimensionLabel = "dimension_label_soft_delete_test";
  const sortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const dimension =
    await generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
      userConnection,
      {
        params: {
          reportDefinitionId: reportDefinition.id,
        },
        body: {
          dimension_key: dimensionKey,
          dimension_label: dimensionLabel,
          sort_order: sortOrder,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate,
      },
    );
  typia.assert(dimension);
  const reportDefinitionId = reportDefinition.id;
  const dimensionId = dimension.id;
  // 3) Soft-delete (deactivate) the dimension
  const deletedAtRequest = new Date().toISOString();
  const deactivated =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateReportDefinitionDimension(
      adminConnection,
      {
        reportDefinitionId,
        dimensionId,
        body: {
          dimension_key: dimensionKey,
          dimension_label: dimensionLabel,
          sort_order: sortOrder,
          deleted_at: deletedAtRequest,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IUpdate,
      },
    );
  typia.assert(deactivated);
  TestValidator.predicate(
    "deletedAt should be non-null after deactivation",
    deactivated.deletedAt !== null,
  );
  TestValidator.equals(
    "dimensionKey preserved after deactivation",
    deactivated.dimensionKey,
    dimensionKey,
  );
  TestValidator.equals(
    "dimensionLabel preserved after deactivation",
    deactivated.dimensionLabel,
    dimensionLabel,
  );
  TestValidator.equals(
    "sortOrder preserved after deactivation",
    deactivated.sortOrder,
    sortOrder,
  );
  // 4) Reactivate the dimension
  const reactivated =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateReportDefinitionDimension(
      adminConnection,
      {
        reportDefinitionId,
        dimensionId,
        body: {
          dimension_key: dimensionKey,
          dimension_label: dimensionLabel,
          sort_order: sortOrder,
          deleted_at: null,
        } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IUpdate,
      },
    );
  typia.assert(reactivated);
  TestValidator.equals(
    "deletedAt should be null after reactivation",
    reactivated.deletedAt,
    null,
  );
  TestValidator.equals(
    "dimensionKey preserved after reactivation",
    reactivated.dimensionKey,
    dimensionKey,
  );
  TestValidator.equals(
    "dimensionLabel preserved after reactivation",
    reactivated.dimensionLabel,
    dimensionLabel,
  );
  TestValidator.equals(
    "sortOrder preserved after reactivation",
    reactivated.sortOrder,
    sortOrder,
  );
}
