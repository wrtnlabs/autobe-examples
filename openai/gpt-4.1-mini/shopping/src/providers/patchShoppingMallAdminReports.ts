import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReport";
import { IPageIShoppingMallReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminReports(props: {
  admin: AdminPayload;
  body: IShoppingMallReport.IRequest;
}): Promise<IPageIShoppingMallReport.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { report_name: { contains: body.search } },
          { report_type: { contains: body.search } },
        ],
      }),
    ...(body.reportType !== undefined &&
      body.reportType !== null && {
        report_type: body.reportType,
      }),
    ...(body.generatedByAdminId !== undefined &&
      body.generatedByAdminId !== null && {
        generated_by_admin_id: body.generatedByAdminId,
      }),
    ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
    (body.createdBefore !== undefined && body.createdBefore !== null)
      ? {
          created_at: {
            ...(body.createdAfter !== undefined &&
              body.createdAfter !== null && { gte: body.createdAfter }),
            ...(body.createdBefore !== undefined &&
              body.createdBefore !== null && { lte: body.createdBefore }),
          },
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reports.count({ where: whereConditions }),
    MyGlobal.prisma.shopping_mall_reports.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        report_name: true,
        report_type: true,
        generated_by_admin_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);

  const data = records.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    report_name: record.report_name,
    report_type: record.report_type,
    generated_by_admin_id: record.generated_by_admin_id ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
