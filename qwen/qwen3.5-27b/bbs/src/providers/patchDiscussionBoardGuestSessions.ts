import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorAtSummaryTransformer";
import { DiscussionBoardGuestAtSummaryTransformer } from "../transformers/DiscussionBoardGuestAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestSessions(props: {
  guest: GuestPayload;
  body: IDiscussionBoardAdministratorSession.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const actorType = props.body.actor_type;
  const status = props.body.status;
  const actorId = props.body.actor_id;
  const createdAtFrom = props.body.created_at_from;
  const createdAtTo = props.body.created_at_to;
  const expiredAtFrom = props.body.expired_at_from;
  const expiredAtTo = props.body.expired_at_to;
  const ip = props.body.ip;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  // Build common where conditions
  const buildWhereInput = (
    table: "guest" | "member" | "administrator",
  ):
    | Prisma.discussion_board_guest_sessionsWhereInput
    | Prisma.discussion_board_member_sessionsWhereInput
    | Prisma.discussion_board_administrator_sessionsWhereInput => {
    const base: any = {};
    // Apply status filter
    if (status === "active") {
      base.expired_at = null;
    } else if (status === "expired") {
      base.expired_at = { not: null };
    }
    // Apply actor_id filter based on table
    if (actorId) {
      if (table === "guest") {
        base.discussion_board_guest_id = actorId;
      } else if (table === "member") {
        base.discussion_board_member_id = actorId;
      } else if (table === "administrator") {
        base.discussion_board_administrator_id = actorId;
      }
    }
    // Apply created_at range filter
    if (createdAtFrom || createdAtTo) {
      base.created_at = {};
      if (createdAtFrom) base.created_at.gte = new Date(createdAtFrom);
      if (createdAtTo) base.created_at.lte = new Date(createdAtTo);
    }
    // Apply expired_at range filter (only for expired sessions)
    if (expiredAtFrom || expiredAtTo) {
      base.expired_at = { not: null };
      if (expiredAtFrom) {
        if (!base.expired_at.gte) base.expired_at.gte = [];
        base.expired_at.gte = new Date(expiredAtFrom);
      }
      if (expiredAtTo) {
        if (!base.expired_at.lte) base.expired_at.lte = [];
        base.expired_at.lte = new Date(expiredAtTo);
      }
    }
    // Apply IP filter
    if (ip) {
      base.ip = { contains: ip };
    }
    return base;
  };
  // Build order by
  const buildOrderBy = ():
    | Prisma.discussion_board_guest_sessionsOrderByWithRelationInput
    | Prisma.discussion_board_member_sessionsOrderByWithRelationInput
    | Prisma.discussion_board_administrator_sessionsOrderByWithRelationInput => {
    return sort === "expired_at"
      ? { expired_at: order as "asc" | "desc" }
      : { created_at: order as "asc" | "desc" };
  };
  // Determine which tables to query based on actor_type filter
  const tablesToQuery: ("guest" | "member" | "administrator")[] = actorType
    ? [actorType]
    : ["guest", "member", "administrator"];
  // Query each table and combine results
  const allSessions: any[] = [];
  let totalCount = 0;
  for (const table of tablesToQuery) {
    const whereInput = buildWhereInput(table);
    const orderByInput = buildOrderBy();
    let tableData: any[] = [];
    let tableTotal = 0;
    if (table === "guest") {
      tableData =
        await MyGlobal.prisma.discussion_board_guest_sessions.findMany({
          where: whereInput as Prisma.discussion_board_guest_sessionsWhereInput,
          skip: skip,
          take: limit,
          orderBy:
            orderByInput as Prisma.discussion_board_guest_sessionsOrderByWithRelationInput,
          select: {
            id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
            guest: DiscussionBoardGuestAtSummaryTransformer.select(),
          },
        });
      tableTotal = await MyGlobal.prisma.discussion_board_guest_sessions.count({
        where: whereInput as Prisma.discussion_board_guest_sessionsWhereInput,
      });
      // Transform guest sessions
      const transformed = await ArrayUtil.asyncMap(
        tableData,
        async (session) => ({
          id: session.id,
          actor_type: "guest" as const,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer ?? undefined,
          created_at: session.created_at.toISOString(),
          expired_at: session.expired_at.toISOString(),
          actor: await DiscussionBoardGuestAtSummaryTransformer.transform(
            session.guest,
          ),
        }),
      );
      allSessions.push(...transformed);
    } else if (table === "member") {
      tableData =
        await MyGlobal.prisma.discussion_board_member_sessions.findMany({
          where:
            whereInput as Prisma.discussion_board_member_sessionsWhereInput,
          skip: skip,
          take: limit,
          orderBy:
            orderByInput as Prisma.discussion_board_member_sessionsOrderByWithRelationInput,
          select: {
            id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
            member: DiscussionBoardMemberAtSummaryTransformer.select(),
          },
        });
      tableTotal = await MyGlobal.prisma.discussion_board_member_sessions.count(
        {
          where:
            whereInput as Prisma.discussion_board_member_sessionsWhereInput,
        },
      );
      // Transform member sessions
      const transformed = await ArrayUtil.asyncMap(
        tableData,
        async (session) => ({
          id: session.id,
          actor_type: "member" as const,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer ?? undefined,
          created_at: session.created_at.toISOString(),
          expired_at: session.expired_at.toISOString(),
          actor: await DiscussionBoardMemberAtSummaryTransformer.transform(
            session.member,
          ),
        }),
      );
      allSessions.push(...transformed);
    } else if (table === "administrator") {
      tableData =
        await MyGlobal.prisma.discussion_board_administrator_sessions.findMany({
          where:
            whereInput as Prisma.discussion_board_administrator_sessionsWhereInput,
          skip: skip,
          take: limit,
          orderBy:
            orderByInput as Prisma.discussion_board_administrator_sessionsOrderByWithRelationInput,
          select: {
            id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
            administrator:
              DiscussionBoardAdministratorAtSummaryTransformer.select(),
          },
        });
      tableTotal =
        await MyGlobal.prisma.discussion_board_administrator_sessions.count({
          where:
            whereInput as Prisma.discussion_board_administrator_sessionsWhereInput,
        });
      // Transform administrator sessions
      const transformed = await ArrayUtil.asyncMap(
        tableData,
        async (session) => ({
          id: session.id,
          actor_type: "administrator" as const,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer ?? undefined,
          created_at: session.created_at.toISOString(),
          expired_at: session.expired_at.toISOString(),
          actor:
            await DiscussionBoardAdministratorAtSummaryTransformer.transform(
              session.administrator,
            ),
        }),
      );
      allSessions.push(...transformed);
    }
    totalCount += tableTotal;
  }
  // Sort combined results
  allSessions.sort((a, b) => {
    const sortField = sort === "expired_at" ? "expired_at" : "created_at";
    const aVal = new Date(a[sortField]).getTime();
    const bVal = new Date(b[sortField]).getTime();
    return order === "asc" ? aVal - bVal : bVal - aVal;
  });
  // Apply pagination to combined results
  const paginatedData = allSessions.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: paginatedData,
  };
}
