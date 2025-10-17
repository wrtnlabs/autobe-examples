import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardUsers(props: {
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const { body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Build where clause dynamically
  const where = {
    deleted_at: null,
    ...(body.account_status !== undefined &&
      body.account_status !== null && {
        account_status: body.account_status,
      }),
    ...(body.email_verified !== undefined &&
      body.email_verified !== null && {
        email_verified: body.email_verified,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim().length > 0 && {
        OR: [
          { username: { contains: body.search.trim() } },
          { display_name: { contains: body.search.trim() } },
        ],
      }),
  };

  // Execute parallel queries for data and count
  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where,
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        account_status: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_members.count({ where }),
  ]);

  // Calculate total pages with edge case handling
  const pages = total > 0 ? Math.ceil(total / limit) : 0;

  // Transform members to ISummary format
  const data = members.map((member) => ({
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    display_name:
      member.display_name === null ? undefined : member.display_name,
    avatar_url: member.avatar_url === null ? undefined : member.avatar_url,
    account_status: member.account_status,
    created_at: toISOStringSafe(member.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
