import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardGuestAtSummaryTransformer } from "../transformers/DiscussionBoardGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminActors(props: {
  admin: AdminPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clauses for each actor table
  const guestWhere: Prisma.discussion_board_guestsWhereInput = {
    deleted_at: null,
  };
  const memberWhere: Prisma.discussion_board_membersWhereInput = {
    deleted_at: null,
  };
  const adminWhere: Prisma.discussion_board_adminsWhereInput = {
    deleted_at: null,
  };
  const superAdminWhere: Prisma.discussion_board_super_adminsWhereInput = {
    deleted_at: null,
  };
  // Apply search filter across all actor tables
  if (props.body.search) {
    const searchPattern = `%${props.body.search}%`;
    // Guests: search in session_token
    guestWhere.OR = [
      { session_token: { contains: searchPattern, mode: "insensitive" } },
    ];
    // Members: search in email only
    memberWhere.OR = [
      { email: { contains: searchPattern, mode: "insensitive" } },
    ];
    // Admins: search in email only
    adminWhere.OR = [
      { email: { contains: searchPattern, mode: "insensitive" } },
    ];
    // Super Admins: search in email only
    superAdminWhere.OR = [
      { email: { contains: searchPattern, mode: "insensitive" } },
    ];
  }
  // Apply role filter to determine which tables to query
  let guestPromises = Promise.resolve({ data: [] as any[], count: 0 });
  let memberPromises = Promise.resolve({ data: [] as any[], count: 0 });
  let adminPromises = Promise.resolve({ data: [] as any[], count: 0 });
  let superAdminPromises = Promise.resolve({ data: [] as any[], count: 0 });
  // Determine which actor types to include based on role filter
  const role = props.body.role;
  if (!role || role === "guest") {
    guestPromises = Promise.all([
      MyGlobal.prisma.discussion_board_guests.findMany({
        where: guestWhere,
        skip,
        take: limit + 1, // Fetch one extra to check if there are more pages
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_guests.count({ where: guestWhere }),
    ]).then((r) => ({ data: r[0], count: r[1] }));
  }
  if (!role || role === "member") {
    memberPromises = Promise.all([
      MyGlobal.prisma.discussion_board_members.findMany({
        where: memberWhere,
        skip,
        take: limit + 1,
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_members.count({ where: memberWhere }),
    ]).then((r) => ({ data: r[0], count: r[1] }));
  }
  if (!role || role === "admin") {
    adminPromises = Promise.all([
      MyGlobal.prisma.discussion_board_admins.findMany({
        where: adminWhere,
        skip,
        take: limit + 1,
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_admins.count({ where: adminWhere }),
    ]).then((r) => ({ data: r[0], count: r[1] }));
  }
  if (!role || role === "superAdmin") {
    superAdminPromises = Promise.all([
      MyGlobal.prisma.discussion_board_super_admins.findMany({
        where: superAdminWhere,
        skip,
        take: limit + 1,
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_super_admins.count({
        where: superAdminWhere,
      }),
    ]).then((r) => ({ data: r[0], count: r[1] }));
  }
  // Execute all queries concurrently
  const [guestResult, memberResult, adminResult, superAdminResult] =
    await Promise.all([
      guestPromises,
      memberPromises,
      adminPromises,
      superAdminPromises,
    ]);
  // Combine all results and transform to summary format
  const allActors = [];
  // Process guests
  if (!role || role === "guest") {
    for (const guest of guestResult.data) {
      allActors.push({
        type: "guest" as const,
        summary:
          await DiscussionBoardGuestAtSummaryTransformer.transform(guest),
      });
    }
  }
  // Process members (need transformer for member summary)
  if (!role || role === "member") {
    // TODO: Add member transformer when available
    for (const member of memberResult.data) {
      allActors.push({
        type: "member" as const,
        summary: {
          id: member.id,
          session_token: member.email,
          created_at: toISOStringSafe(member.created_at),
        } as IDiscussionBoardGuest.ISummary,
      });
    }
  }
  // Process admins
  if (!role || role === "admin") {
    for (const admin of adminResult.data) {
      allActors.push({
        type: "admin" as const,
        summary: {
          id: admin.id,
          session_token: admin.email,
          created_at: toISOStringSafe(admin.created_at),
        } as IDiscussionBoardGuest.ISummary,
      });
    }
  }
  // Process super admins
  if (!role || role === "superAdmin") {
    for (const superAdmin of superAdminResult.data) {
      allActors.push({
        type: "superAdmin" as const,
        summary: {
          id: superAdmin.id,
          session_token: superAdmin.email,
          created_at: toISOStringSafe(superAdmin.created_at),
        } as IDiscussionBoardGuest.ISummary,
      });
    }
  }
  // Sort all actors by created_at descending
  allActors.sort(
    (a, b) =>
      new Date(b.summary.created_at).getTime() -
      new Date(a.summary.created_at).getTime(),
  );
  // Apply pagination to combined results
  const paginatedActors = allActors.slice(skip, skip + limit);
  // Calculate total count from all tables
  const totalRecords =
    (!role || role === "guest" ? guestResult.count : 0) +
    (!role || role === "member" ? memberResult.count : 0) +
    (!role || role === "admin" ? adminResult.count : 0) +
    (!role || role === "superAdmin" ? superAdminResult.count : 0);
  // Transform to final response format
  const finalData = paginatedActors.map((actor) => actor.summary);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data: finalData,
  };
}
