import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportDefinitionFilterTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  filterId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportDefinitionFilter> {
  // Scope to the requested report definition (and ensure it is not soft-deleted)
  // so that filter lookup cannot escape the definition.
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findFirstOrThrow(
      {
        where: {
          id: props.reportDefinitionId,
          deleted_at: null,
        } satisfies Prisma.erp_hrm_time_tracking_report_definitionsWhereInput,
        select: {
          id: true,
        },
      },
    );
  // Load the filter within the same report definition (and ensure it is not soft-deleted)
  const filter =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_filters.findFirstOrThrow(
      {
        where: {
          id: props.filterId,
          erp_hrm_time_tracking_report_definition_id: reportDefinition.id,
          deleted_at: null,
        } satisfies Prisma.erp_hrm_time_tracking_report_definition_filtersWhereInput,
        ...ErpHrmTimeTrackingReportDefinitionFilterTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingReportDefinitionFilterTransformer.transform(
    filter,
  );
}
