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

export async function putShoppingMallAdminReportsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallReport.IUpdate;
}): Promise<IShoppingMallReport> {
  const { admin, id, body } = props;

  // Check if report exists and not deleted
  const existing = await MyGlobal.prisma.shopping_mall_reports.findUnique({
    where: { id },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException(`Report not found or deleted`, 404);
  }

  // Check uniqueness of report_name ignoring current id
  const conflict = await MyGlobal.prisma.shopping_mall_reports.findFirst({
    where: {
      report_name: body.report_name,
      id: { not: id },
      deleted_at: null,
    },
  });

  if (conflict) {
    throw new HttpException(`Report name already exists`, 409);
  }

  // Prepare updated fields applying null vs undefined handling and conversion
  return MyGlobal.prisma.shopping_mall_reports
    .update({
      where: { id },
      data: {
        report_name: body.report_name,
        report_type: body.report_type,
        content_uri:
          body.content_uri === undefined
            ? undefined
            : body.content_uri === null
              ? undefined
              : body.content_uri,
        generated_by_admin_id:
          body.generated_by_admin_id === undefined
            ? undefined
            : body.generated_by_admin_id === null
              ? undefined
              : body.generated_by_admin_id,
        created_at:
          body.created_at === undefined
            ? undefined
            : body.created_at === null
              ? undefined
              : new Date(body.created_at),
        updated_at:
          body.updated_at === undefined
            ? undefined
            : body.updated_at === null
              ? undefined
              : new Date(body.updated_at),
        deleted_at:
          body.deleted_at === undefined
            ? undefined
            : body.deleted_at === null
              ? undefined
              : new Date(body.deleted_at),
      },
    })
    .then((updated) => ({
      id: updated.id satisfies string as string & tags.Format<"uuid">,
      reportName: updated.report_name,
      reportType: updated.report_type,
      contentUri:
        updated.content_uri === undefined
          ? undefined
          : updated.content_uri === null
            ? undefined
            : updated.content_uri,
      generatedByAdminId:
        updated.generated_by_admin_id === undefined
          ? undefined
          : updated.generated_by_admin_id === null
            ? undefined
            : (updated.generated_by_admin_id satisfies string as string &
                tags.Format<"uuid">),
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: toISOStringSafe(updated.updated_at),
      deletedAt:
        updated.deleted_at === undefined
          ? undefined
          : updated.deleted_at === null
            ? null
            : toISOStringSafe(updated.deleted_at),
    }));
}
