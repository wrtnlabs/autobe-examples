import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminModerationReports(props: {
  admin: AdminPayload;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  // Defaults and extract filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Compose dynamic where-filter for reports
  const reportWhere: Record<string, unknown> = {
    deleted_at: null,
    // Target type filter
    ...(props.body.target_type != null && {
      target_type: props.body.target_type,
    }),
    // Status filter
    ...(props.body.status != null && { status: props.body.status }),
    // Reporter user filter
    ...(props.body.reporter_user_id != null && {
      reporter_user_id: props.body.reporter_user_id,
    }),
    // Reason substring search (case-insensitive)
    ...(props.body.reason != null &&
      props.body.reason !== "" && {
        reason: { contains: props.body.reason, mode: "insensitive" },
      }),
    // Date ranges
    ...(() => {
      if (!props.body.created_at_from && !props.body.created_at_to) return {};
      return {
        created_at: {
          ...(props.body.created_at_from != null && {
            gte: props.body.created_at_from,
          }),
          ...(props.body.created_at_to != null && {
            lte: props.body.created_at_to,
          }),
        },
      };
    })(),
  };

  // Compose sorting
  let orderBy: Record<string, "asc" | "desc">[] = [];
  const sortableFields = ["created_at", "status"];
  if (
    typeof props.body.sort_by === "string" &&
    sortableFields.includes(props.body.sort_by)
  ) {
    orderBy.push({
      [props.body.sort_by]: props.body.sort_order === "asc" ? "asc" : "desc",
    });
  } else {
    // Default sort: created_at descending
    orderBy.push({ created_at: "desc" });
  }

  // Query reports and total in parallel
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.findMany({
      where: reportWhere,
      orderBy,
      skip,
      take: limit,
      include: {
        reporterUser: true,
      },
    }),
    MyGlobal.prisma.discussion_board_reports.count({ where: reportWhere }),
  ]);

  // Compose result
  const data = reports.map((r) => ({
    id: r.id,
    reporter: {
      id: r.reporterUser.id,
      email: r.reporterUser.email,
      is_email_verified: r.reporterUser.is_email_verified,
      is_active: r.reporterUser.is_active,
      is_blocked: r.reporterUser.is_blocked,
      created_at: toISOStringSafe(r.reporterUser.created_at),
      updated_at: toISOStringSafe(r.reporterUser.updated_at),
      deleted_at:
        r.reporterUser.deleted_at === null
          ? undefined
          : toISOStringSafe(r.reporterUser.deleted_at),
    },
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    description: r.description ?? undefined,
    status: r.status,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
