import { IDiscussionBoardDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDateRange";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserPasswordResetAtSummaryTransformer } from "../transformers/DiscussionBoardUserPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserPasswordResets(props: {
  user: UserPayload;
  body: IDiscussionBoardUserPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardUserPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = toISOStringSafe(new Date());
  // Build unified WHERE conditions that work across all password reset tables
  const baseWhere = {
    ...buildStatusWhere(props.body.status, now),
    ...buildDateRangeWhere(props.body.created_at_range, "created_at"),
    ...buildDateRangeWhere(props.body.expired_at_range, "expired_at"),
  };
  // Determine which user types to query
  const userTypes = props.body.user_type
    ? [props.body.user_type]
    : ["user", "admin", "super_admin"];
  const allResults: IDiscussionBoardUserPasswordReset.ISummary[] = [];
  let totalRecords = 0;
  // Query each user type and combine results
  for (const userType of userTypes) {
    let results: IDiscussionBoardUserPasswordReset.ISummary[] = [];
    let count = 0;
    switch (userType) {
      case "user":
        const userData =
          await MyGlobal.prisma.discussion_board_user_password_resets.findMany({
            where: { ...baseWhere, deleted_at: null },
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            ...DiscussionBoardUserPasswordResetAtSummaryTransformer.select(),
          });
        results = await ArrayUtil.asyncMap(
          userData,
          DiscussionBoardUserPasswordResetAtSummaryTransformer.transform,
        );
        count =
          await MyGlobal.prisma.discussion_board_user_password_resets.count({
            where: { ...baseWhere, deleted_at: null },
          });
        break;
      case "admin":
        const adminData =
          await MyGlobal.prisma.discussion_board_admin_password_resets.findMany(
            {
              where: baseWhere,
              skip,
              take: limit,
              orderBy: { created_at: "desc" },
              select: {
                id: true,
                discussion_board_admin_id: true,
                expires_at: true,
                used_at: true,
                created_at: true,
              },
            },
          );
        // Fetch admin details separately
        const adminIds = adminData.map(
          (record) => record.discussion_board_admin_id,
        );
        const admins = await MyGlobal.prisma.discussion_board_admins.findMany({
          where: { id: { in: adminIds } },
          select: {
            id: true,
            display_name: true,
            created_at: true,
            updated_at: true,
          },
        });
        const adminMap = new Map(
          admins.map(
            (admin: {
              id: string;
              display_name: string;
              created_at: Date;
              updated_at: Date;
            }) => [admin.id, admin],
          ),
        );
        results = adminData.map((record) => {
          const admin = adminMap.get(record.discussion_board_admin_id);
          return {
            id: record.id,
            user: admin
              ? {
                  id: admin.id,
                  display_name: admin.display_name,
                  bio: null,
                  created_at: toISOStringSafe(admin.created_at),
                  updated_at: toISOStringSafe(admin.updated_at),
                }
              : {
                  id: record.discussion_board_admin_id,
                  display_name: "Unknown Admin",
                  bio: null,
                  created_at: toISOStringSafe(new Date()),
                  updated_at: toISOStringSafe(new Date()),
                },
            expired_at: toISOStringSafe(record.expires_at),
            used_at: record.used_at ? toISOStringSafe(record.used_at) : null,
            created_at: toISOStringSafe(record.created_at),
          };
        });
        count =
          await MyGlobal.prisma.discussion_board_admin_password_resets.count({
            where: baseWhere,
          });
        break;
      case "super_admin":
        const superAdminData =
          await MyGlobal.prisma.discussion_board_super_admin_password_resets.findMany(
            {
              where: baseWhere,
              skip,
              take: limit,
              orderBy: { created_at: "desc" },
              select: {
                id: true,
                discussion_board_super_admin_id: true,
                expired_at: true,
                used_at: true,
                created_at: true,
              },
            },
          );
        // Fetch super admin details separately
        const superAdminIds = superAdminData.map(
          (record) => record.discussion_board_super_admin_id,
        );
        const superAdmins =
          await MyGlobal.prisma.discussion_board_super_admins.findMany({
            where: { id: { in: superAdminIds } },
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
            },
          });
        const superAdminMap = new Map(
          superAdmins.map(
            (superAdmin: {
              id: string;
              email: string;
              created_at: Date;
              updated_at: Date;
            }) => [superAdmin.id, superAdmin],
          ),
        );
        results = superAdminData.map((record) => {
          const superAdmin = superAdminMap.get(
            record.discussion_board_super_admin_id,
          );
          return {
            id: record.id,
            user: superAdmin
              ? {
                  id: superAdmin.id,
                  display_name: superAdmin.email,
                  bio: null,
                  created_at: toISOStringSafe(superAdmin.created_at),
                  updated_at: toISOStringSafe(superAdmin.updated_at),
                }
              : {
                  id: record.discussion_board_super_admin_id,
                  display_name: "Unknown Super Admin",
                  bio: null,
                  created_at: toISOStringSafe(new Date()),
                  updated_at: toISOStringSafe(new Date()),
                },
            expired_at: toISOStringSafe(record.expired_at),
            used_at: record.used_at ? toISOStringSafe(record.used_at) : null,
            created_at: toISOStringSafe(record.created_at),
          };
        });
        count =
          await MyGlobal.prisma.discussion_board_super_admin_password_resets.count(
            { where: baseWhere },
          );
        break;
    }
    allResults.push(...results);
    totalRecords += count;
  }
  // Sort all results by creation date (newest first)
  allResults.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Apply pagination to the combined results
  const paginatedData = allResults.slice(0, limit);
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
  };
}
// Helper function to build status WHERE conditions
function buildStatusWhere(
  status: "used" | "unused" | "expired" | null | undefined,
  now: string,
): any {
  switch (status) {
    case "used":
      return { used_at: { not: null } };
    case "unused":
      return {
        used_at: null,
        expired_at: { gt: now },
      };
    case "expired":
      return {
        used_at: null,
        expired_at: { lte: now },
      };
    default:
      return {};
  }
}
// Helper function to build date range WHERE conditions
function buildDateRangeWhere(
  range: IDiscussionBoardDateRange | null | undefined,
  field: string,
): any {
  if (!range) return {};
  const conditions: any = {};
  if (range.start) conditions.gte = range.start;
  if (range.end) conditions.lte = range.end;
  return conditions.gte || conditions.lte ? { [field]: conditions } : {};
}
