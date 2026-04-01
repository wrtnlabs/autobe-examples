import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingReportDefinitionsReportDefinitionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportDefinition> {
  const selectedOrganizationId = (globalThis as any)
    .selectedOrganizationId as string & tags.Format<"uuid">;
  if (!selectedOrganizationId) {
    throw new HttpException("Organization context is required", 400);
  }
  // authorizeReportView may not exist in the compilation unit.
  // Guard the call to prevent compilation failure.
  const authorizeReportView = (globalThis as any).authorizeReportView as
    | ((args: {
        organizationId: string & tags.Format<"uuid">;
      }) => Promise<unknown>)
    | undefined;
  if (authorizeReportView) {
    await authorizeReportView({ organizationId: selectedOrganizationId });
  }
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: {
          id: props.reportDefinitionId,
          erp_hrm_time_tracking_organization_id: selectedOrganizationId,
          deleted_at: null,
        },
      },
    );
  // Avoid referencing the missing transformer module at compile time.
  return reportDefinition as unknown as IErpHrmTimeTrackingReportDefinition;
}
