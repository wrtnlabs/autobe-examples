import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IPageIRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminReportsReportIdReportActions(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportAction.IRequest;
}): Promise<IPageIRedditCommunityReportAction> {
  const { admin, reportId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_report_actionsWhereInput = {
    report_id: reportId,
    ...(body.filterModeratorMemberId !== undefined &&
      body.filterModeratorMemberId !== null && {
        moderator_member_id: body.filterModeratorMemberId,
      }),
    ...(body.filterAdminMemberId !== undefined &&
      body.filterAdminMemberId !== null && {
        admin_member_id: body.filterAdminMemberId,
      }),
    ...(body.filterActionType !== undefined &&
      body.filterActionType !== null && { action_type: body.filterActionType }),
    ...((body.filterCreatedAtFrom !== undefined &&
      body.filterCreatedAtFrom !== null) ||
    (body.filterCreatedAtTo !== undefined && body.filterCreatedAtTo !== null)
      ? {
          created_at: {
            ...(body.filterCreatedAtFrom !== undefined &&
              body.filterCreatedAtFrom !== null && {
                gte: body.filterCreatedAtFrom,
              }),
            ...(body.filterCreatedAtTo !== undefined &&
              body.filterCreatedAtTo !== null && {
                lte: body.filterCreatedAtTo,
              }),
          },
        }
      : {}),
    deleted_at: null,
  };

  const orderField = ["created_at", "updated_at", "action_type"].includes(
    body.sortBy ?? "",
  )
    ? (body.sortBy ?? "created_at")
    : "created_at";
  const orderDirection = body.order === "asc" ? "asc" : "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_report_actions.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_report_actions.count({ where }),
  ]);

  const data: IRedditCommunityReportAction[] = records.map((item) => ({
    id: item.id,
    report_id: item.report_id,
    moderator_member_id: item.moderator_member_id,
    admin_member_id: item.admin_member_id ?? null,
    action_type: item.action_type,
    notes: item.notes ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
