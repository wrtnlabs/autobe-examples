import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportDefinitionTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingReportDefinitionsReportDefinitionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinition.IUpdate;
}): Promise<IErpHrmTimeTrackingReportDefinition> {
  const organizationId =
    (
      MyGlobal as unknown as {
        getSelectedOrganizationId?: () => (string & tags.Format<"uuid">) | null;
      }
    ).getSelectedOrganizationId?.() ?? null;
  if (organizationId === null) {
    throw new HttpException(
      "Organization context must be selected before accessing report definitions",
      400,
    );
  }
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: ErpHrmTimeTrackingReportDefinitionTransformer.select().select,
      } as never,
    );
  if (
    reportDefinition.erp_hrm_time_tracking_organization_id !== organizationId
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (reportDefinition.deleted_at !== null) {
    throw new HttpException("Report definition not found", 404);
  }
  if (props.body.code !== undefined) {
    const conflict =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUnique(
        {
          where: {
            erp_hrm_time_tracking_organization_id_code: {
              erp_hrm_time_tracking_organization_id: organizationId,
              code: props.body.code,
            },
          },
          select: { id: true },
        },
      );
    if (conflict && conflict.id !== props.reportDefinitionId) {
      throw new HttpException(
        "Report code already exists in this organization",
        409,
      );
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_report_definitions.update({
      where: { id: props.reportDefinitionId },
      data: {
        ...(props.body.code !== undefined && { code: props.body.code }),
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.report_type !== undefined && {
          report_type: props.body.report_type,
        }),
        ...(props.body.is_active !== undefined && {
          is_active: props.body.is_active,
        }),
        updated_at: new Date(),
      },
    });
    return await tx.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow({
      where: { id: props.reportDefinitionId },
      ...ErpHrmTimeTrackingReportDefinitionTransformer.select(),
    });
  });
  return await ErpHrmTimeTrackingReportDefinitionTransformer.transform(updated);
}
