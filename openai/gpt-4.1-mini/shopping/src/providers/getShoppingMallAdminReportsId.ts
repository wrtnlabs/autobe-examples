import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminReportsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReport> {
  const { admin, id } = props;

  // Verify admin existence and active status
  const adminRecord = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!adminRecord) {
    throw new HttpException("Unauthorized: Admin not found or inactive", 403);
  }

  // Find report by ID and not soft deleted
  const report = await MyGlobal.prisma.shopping_mall_reports.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  if (!report) {
    throw new HttpException(`Report with ID ${id} not found`, 404);
  }

  return {
    id: report.id,
    generatedByAdminId: report.generated_by_admin_id ?? undefined,
    reportName: report.report_name,
    reportType: report.report_type,
    contentUri: report.content_uri ?? undefined,
    createdAt: toISOStringSafe(report.created_at),
    updatedAt: toISOStringSafe(report.updated_at),
    deletedAt: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
