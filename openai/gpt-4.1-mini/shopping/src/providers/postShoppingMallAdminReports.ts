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

export async function postShoppingMallAdminReports(props: {
  admin: AdminPayload;
  body: IShoppingMallReport.ICreate;
}): Promise<IShoppingMallReport> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_reports.create({
    data: {
      id,
      report_name: body.report_name,
      report_type: body.report_type,
      content_uri: body.content_uri ?? null,
      generated_by_admin_id: body.generated_by_admin_id ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reportName: created.report_name,
    reportType: created.report_type,
    contentUri: created.content_uri ?? undefined,
    generatedByAdminId: created.generated_by_admin_id ?? undefined,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
