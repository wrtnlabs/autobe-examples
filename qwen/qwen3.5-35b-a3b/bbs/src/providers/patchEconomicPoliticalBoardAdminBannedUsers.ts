import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
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

export async function patchEconomicPoliticalBoardAdminBannedUsers(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardBanRecord.IRequest;
}): Promise<IPageIEconomicPoliticalBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 100;
  const limit = props.body.limit ?? 100;
  const effectiveLimit = Math.min(limit, 100);
  const skip = (page - 1) * effectiveLimit;
  const whereInput: Prisma.economic_political_board_ban_recordsWhereInput = {
    ...(props.body.dateFrom && {
      created_at: { gte: props.body.dateFrom },
    }),
    ...(props.body.dateTo && {
      created_at: { lte: props.body.dateTo },
    }),
    ...(props.body.reasonKeywords && {
      reason: {
        contains: props.body.reasonKeywords,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.economic_political_board_ban_recordsWhereInput;
  const orderByInput = (
    props.body.sortBy === "user_id"
      ? [{ user_id: props.body.sortOrder ?? "desc" }]
      : props.body.sortBy === "banned_by_admin_id"
        ? [{ banned_by_admin_id: props.body.sortOrder ?? "desc" }]
        : [{ created_at: props.body.sortOrder ?? "desc" }]
  ) satisfies Prisma.economic_political_board_ban_recordsOrderByWithRelationInput[];
  const total =
    await MyGlobal.prisma.economic_political_board_ban_records.count({
      where: whereInput,
    });
  const data =
    await MyGlobal.prisma.economic_political_board_ban_records.findMany({
      where: whereInput,
      skip,
      take: effectiveLimit,
      orderBy: orderByInput,
      select: {
        id: true,
        user_id: true,
        banned_by_admin_id: true,
        reason: true,
        created_at: true,
        user: {
          select: {
            id: true,
            user_id: true,
            grade: true,
            promoted_by_user_id: true,
            promoted_at: true,
            created_at: true,
            updated_at: true,
          },
        },
        bannedByAdmin: {
          select: {
            id: true,
            user_id: true,
            grade: true,
            promoted_by_user_id: true,
            promoted_at: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  const summaryData = await ArrayUtil.asyncMap(data, async (record) => {
    const userRoleSummary: IEconomicPoliticalBoardAdministratorRole.ISummary = {
      id: record.user.id,
      userId: record.user.user_id,
      grade: typia.assert<"regular" | "super">(record.user.grade),
      promotedByUserId: record.user.promoted_by_user_id,
      promotedAt: (record.user.promoted_at?.toISOString() ?? null) as
        | (string & tags.Format<"date-time">)
        | null,
      createdAt: toISOStringSafe(record.user.created_at),
      updatedAt: toISOStringSafe(record.user.updated_at),
      user: {
        id: record.user.user_id,
        email: "unknown@example.com",
        displayName: "Unknown User",
        bio: "",
      } satisfies IEconomicPoliticalBoardMember.ISummary,
    } satisfies IEconomicPoliticalBoardAdministratorRole.ISummary;
    const bannedByAdminSummary: IEconomicPoliticalBoardAdministratorRole.ISummary =
      {
        id: record.bannedByAdmin.id,
        userId: record.bannedByAdmin.user_id,
        grade: typia.assert<"regular" | "super">(record.bannedByAdmin.grade),
        promotedByUserId: record.bannedByAdmin.promoted_by_user_id,
        promotedAt: (record.bannedByAdmin.promoted_at?.toISOString() ??
          null) as (string & tags.Format<"date-time">) | null,
        createdAt: toISOStringSafe(record.bannedByAdmin.created_at),
        updatedAt: toISOStringSafe(record.bannedByAdmin.updated_at),
        user: {
          id: record.bannedByAdmin.user_id,
          email: "admin@example.com",
          displayName: "Unknown Admin",
          bio: "",
        } satisfies IEconomicPoliticalBoardMember.ISummary,
      } satisfies IEconomicPoliticalBoardAdministratorRole.ISummary;
    return {
      id: record.id,
      user_id: record.user_id,
      banned_by_admin_id: record.banned_by_admin_id,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
      user: userRoleSummary,
      bannedByAdmin: bannedByAdminSummary,
    } satisfies IEconomicPoliticalBoardBanRecord.ISummary;
  });
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicPoliticalBoardBanRecord.ISummary;
}
