import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import { IPageICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReports";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReports.IRequest;
}): Promise<IPageICommunityPlatformReports.ISummary> {
  const body = props.body;
  const page = typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1 && body.limit <= 100
      ? body.limit
      : 20;

  const where = {
    ...(body.report_type ? { report_type: body.report_type } : {}),
    ...(body.status ? { status: body.status } : {}),
    ...(body.created_from ? { created_at: { gte: body.created_from } } : {}),
    ...(body.created_to ? { created_at: { lte: body.created_to } } : {}),
    ...(typeof body.auto_hidden === "boolean"
      ? { auto_hidden: body.auto_hidden }
      : {}),
    ...(body.reporter_user_id
      ? { reporter_user_id: body.reporter_user_id }
      : {}),
    ...(body.reporter_admin_id
      ? { reporter_admin_id: body.reporter_admin_id }
      : {}),
    deleted_at: null,
  };

  const sort_by = body.sort_by === "updated_at" ? "updated_at" : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  const [total, reports] = await Promise.all([
    MyGlobal.prisma.community_platform_reports.count({ where }),
    MyGlobal.prisma.community_platform_reports.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        reporterUser: {
          select: { id: true, display_name: true },
        },
        reporterAdmin: {
          select: { id: true, display_name: true },
        },
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reports.map((r) => ({
      id: r.id,
      report_type: r.report_type,
      status: r.status,
      description: r.description ?? undefined,
      auto_hidden: r.auto_hidden,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : undefined,
      reporter_user: r.reporterUser
        ? { id: r.reporterUser.id, display_name: r.reporterUser.display_name }
        : undefined,
      reporter_admin: r.reporterAdmin
        ? { id: r.reporterAdmin.id, display_name: r.reporterAdmin.display_name }
        : undefined,
    })),
  };
}
