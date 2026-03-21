import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmAdminOrganizationsOrganizationIdReportsReportId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.erp_hrm_reports.findUnique({
    where: { id: props.reportId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Access denied", 403);
  }
  await MyGlobal.prisma.erp_hrm_reports.delete({
    where: { id: props.reportId },
  });
}
