import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSessions";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMemberSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSessions";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardMembersDiscussionBoardMemberIdSessions(props: {
  admin: AdminPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberSessions.IRequest;
}): Promise<IPageIDiscussionBoardMemberSessions.ISummary> {
  const page = props.body.pagination?.current ?? 1;
  const limit = props.body.pagination?.limit ?? 20;
  const skip = (page - 1) * limit;

  const orderDirection = (
    props.body.sort
      ? props.body.sort.toLowerCase() === "asc"
        ? "asc"
        : "desc"
      : "desc"
  ) satisfies Prisma.SortOrder;

  const orderBy = { created_at: orderDirection } satisfies {
    created_at: Prisma.SortOrder;
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: {
        discussion_board_member_id: props.discussionBoardMemberId,
      },
      orderBy,
      take: limit,
      skip,
    }),
    MyGlobal.prisma.discussion_board_member_sessions.count({
      where: {
        discussion_board_member_id: props.discussionBoardMemberId,
      },
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      ip: session.ip,
      href: session.href as string & tags.Format<"uri">,
      referrer: session.referrer as string & tags.Format<"uri">,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
