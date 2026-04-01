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

export async function deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const organizationId =
    (MyGlobal as any).selectedOrganizationId ??
    (MyGlobal as any).organizationId ??
    (MyGlobal as any).selected_org_id;
  if (!organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
    {
      where: {
        erp_hrm_time_tracking_organization_id: {
          id: props.reportDefinitionId,
          erp_hrm_time_tracking_organization_id: organizationId,
        },
      } as any,
    },
  );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_report_definitions.update({
      where: {
        erp_hrm_time_tracking_organization_id: {
          id: props.reportDefinitionId,
          erp_hrm_time_tracking_organization_id: organizationId,
        },
      } as any,
      data: {
        deleted_at: now,
        is_active: false,
        updated_at: now,
      },
    });
  });
}
