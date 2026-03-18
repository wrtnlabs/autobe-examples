import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  filterId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Association check: filter must exist and belong to the specified report definition.
    await tx.erp_hrm_time_tracking_report_definition_filters.findFirstOrThrow({
      where: {
        id: props.filterId,
        erp_hrm_time_tracking_report_definition_id: props.reportDefinitionId,
      },
      select: { id: true },
    });
    // Delete only that single configured filter row.
    await tx.erp_hrm_time_tracking_report_definition_filters.delete({
      where: { id: props.filterId },
    });
  });
}
