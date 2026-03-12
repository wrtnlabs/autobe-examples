import { IDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberPasswordResets(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdministratorPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const userType = props.body.user_type;
  const status = props.body.status;
  const createdAtFrom = props.body.created_at_from;
  const createdAtTo = props.body.created_at_to;
  const searchEmail = props.body.search_email;
  const searchUserId = props.body.search_user_id;
  const searchIpAddress = props.body.search_ip_address;
  const searchUserAgent = props.body.search_user_agent;
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const buildMemberWhere =
    (): Prisma.discussion_board_member_password_resetsWhereInput => {
      const where: Prisma.discussion_board_member_password_resetsWhereInput =
        {};
      if (userType === "administrator") {
        return { id: "NON_MATCHING_UUID" };
      }
      if (status === "used") {
        where.used_at = { not: null };
      } else if (status === "unused") {
        where.used_at = null;
      }
      if (createdAtFrom && createdAtTo) {
        where.created_at = {
          gte: new Date(createdAtFrom),
          lte: new Date(createdAtTo),
        };
      } else if (createdAtFrom) {
        where.created_at = {
          gte: new Date(createdAtFrom),
        };
      } else if (createdAtTo) {
        where.created_at = {
          lte: new Date(createdAtTo),
        };
      }
      if (searchEmail) {
        where.member = {
          email: { contains: searchEmail },
        };
      }
      if (searchUserId) {
        where.discussion_board_members_id = searchUserId;
      }
      if (searchIpAddress) {
        where.ip_address = { contains: searchIpAddress };
      }
      if (searchUserAgent) {
        where.user_agent = { contains: searchUserAgent };
      }
      return where;
    };
  const buildAdminWhere =
    (): Prisma.discussion_board_administrator_password_resetsWhereInput => {
      const where: Prisma.discussion_board_administrator_password_resetsWhereInput =
        {};
      if (userType === "member") {
        return { id: "NON_MATCHING_UUID" };
      }
      if (status === "used") {
        where.used_at = { not: null };
      } else if (status === "unused") {
        where.used_at = null;
      }
      if (createdAtFrom && createdAtTo) {
        where.created_at = {
          gte: new Date(createdAtFrom),
          lte: new Date(createdAtTo),
        };
      } else if (createdAtFrom) {
        where.created_at = {
          gte: new Date(createdAtFrom),
        };
      } else if (createdAtTo) {
        where.created_at = {
          lte: new Date(createdAtTo),
        };
      }
      if (searchEmail) {
        where.administrator = {
          email: { contains: searchEmail },
        };
      }
      if (searchUserId) {
        where.discussion_board_administrators_id = searchUserId;
      }
      return where;
    };
  const memberWhere = buildMemberWhere();
  const adminWhere = buildAdminWhere();
  const [memberRecords, adminRecords, memberTotal, adminTotal] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_member_password_resets.findMany({
        where: memberWhere,
        include: {
          member: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      MyGlobal.prisma.discussion_board_administrator_password_resets.findMany({
        where: adminWhere,
        include: {
          administrator: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      MyGlobal.prisma.discussion_board_member_password_resets.count({
        where: memberWhere,
      }),
      MyGlobal.prisma.discussion_board_administrator_password_resets.count({
        where: adminWhere,
      }),
    ]);
  const transformMemberRecord = (record: {
    id: string;
    token: string;
    created_at: Date;
    expired_at: Date;
    used_at: Date | null;
    ip_address: string | null;
    user_agent: string | null;
    member: {
      id: string;
      email: string;
    };
  }): IDiscussionBoardAdministratorPasswordReset.ISummary => ({
    id: record.id,
    user_type: "member",
    user_id: record.member.id,
    user_email: record.member.email,
    token: record.token,
    created_at: toISOStringSafe(record.created_at),
    expired_at: toISOStringSafe(record.expired_at),
    used_at: record.used_at ? toISOStringSafe(record.used_at) : null,
    is_used: record.used_at !== null,
    user_agent: record.user_agent,
    ip_address: record.ip_address,
  });
  const transformAdminRecord = (record: {
    id: string;
    token: string;
    created_at: Date;
    expires_at: Date;
    used_at: Date | null;
    administrator: {
      id: string;
      email: string;
    };
  }): IDiscussionBoardAdministratorPasswordReset.ISummary => ({
    id: record.id,
    user_type: "administrator",
    user_id: record.administrator.id,
    user_email: record.administrator.email,
    token: record.token,
    created_at: toISOStringSafe(record.created_at),
    expired_at: toISOStringSafe(record.expires_at),
    used_at: record.used_at ? toISOStringSafe(record.used_at) : null,
    is_used: record.used_at !== null,
    user_agent: null,
    ip_address: null,
  });
  const memberSummaries = memberRecords.map(transformMemberRecord);
  const adminSummaries = adminRecords.map(transformAdminRecord);
  let allSummaries = [...memberSummaries, ...adminSummaries];
  const sortField = sort ?? "created_at";
  const sortDir = direction ?? "desc";
  const multiplier = sortDir === "asc" ? 1 : -1;
  allSummaries.sort((a, b) => {
    let comparison = 0;
    if (sortField === "created_at") {
      comparison = a.created_at.localeCompare(b.created_at);
    } else if (sortField === "expired_at") {
      comparison = a.expired_at.localeCompare(b.expired_at);
    } else if (sortField === "used_at") {
      if (a.used_at === null && b.used_at === null) {
        comparison = 0;
      } else if (a.used_at === null) {
        comparison = 1;
      } else if (b.used_at === null) {
        comparison = -1;
      } else {
        comparison = a.used_at.localeCompare(b.used_at);
      }
    } else if (sortField === "user_email") {
      comparison = a.user_email.localeCompare(b.user_email);
    } else if (sortField === "user_type") {
      comparison = a.user_type.localeCompare(b.user_type);
    }
    return comparison * multiplier;
  });
  const total = memberTotal + adminTotal;
  const paginatedData = allSummaries.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: paginatedData,
  };
}
