import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";
import { IPageICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportEscalation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorReportEscalations(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformReportEscalation.IRequest;
}): Promise<IPageICommunityPlatformReportEscalation.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  // Build where condition from filters
  const where: Record<string, unknown> = {};
  if (props.body.escalation_status !== undefined) {
    where.escalation_status = props.body.escalation_status;
  }
  if (props.body.escalated_to_administrator_id !== undefined) {
    where.escalated_to_administrator_id =
      props.body.escalated_to_administrator_id;
  }
  if (props.body.escalation_reason !== undefined) {
    where.escalation_reason = { contains: props.body.escalation_reason };
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined)
      (where.created_at as any).gte = props.body.created_at_from;
    if (props.body.created_at_to !== undefined)
      (where.created_at as any).lte = props.body.created_at_to;
  }
  if (
    props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
  ) {
    where.updated_at = {};
    if (props.body.updated_at_from !== undefined)
      (where.updated_at as any).gte = props.body.updated_at_from;
    if (props.body.updated_at_to !== undefined)
      (where.updated_at as any).lte = props.body.updated_at_to;
  }

  // Sorting logic
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (
    props.body.sort_by !== undefined &&
    typeof props.body.sort_by === "string"
  ) {
    orderBy = {
      [props.body.sort_by]: props.body.sort_order === "asc" ? "asc" : "desc",
    };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_report_escalations.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        report: true,
        escalatedToAdministrator: true,
      },
    }),
    MyGlobal.prisma.community_platform_report_escalations.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    report: {
      id: row.report.id,
    },
    escalation_reason: row.escalation_reason,
    escalation_status: row.escalation_status,
    escalated_to_administrator: row.escalatedToAdministrator
      ? {
          id: row.escalatedToAdministrator.id,
        }
      : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
