import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorMembersUsernameSessions(props: {
  moderator: ModeratorPayload;
  username: string;
  body: IDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberSession.ISummary> {
  // Find the member by username
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      username: props.username,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException(
      `Member with username "${props.username}" not found`,
      404,
    );
  }

  // Build search conditions
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const whereCondition = {
    discussion_board_member_id: member.id,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { ip: { contains: props.body.search } },
        { href: { contains: props.body.search } },
        { referrer: { contains: props.body.search } },
      ],
    }),
  };

  // Build orderBy condition
  const orderByField = props.body.sort_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  const orderBy = { [orderByField]: orderDirection };

  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_member_sessions.count({
      where: whereCondition,
    }),
  ]);

  // Convert to response format
  const sessions = data.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    deleted_at: session.deleted_at
      ? toISOStringSafe(session.deleted_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions,
  };
}
