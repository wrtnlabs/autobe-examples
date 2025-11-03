import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getAuthMemberSessions(props: {
  member: MemberPayload;
}): Promise<IDiscussionBoardMember.ISessionsPage> {
  const { member } = props;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_member_sessions.findMany({
        where: { discussion_board_member_id: member.id },
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_member_sessions.count({
        where: { discussion_board_member_id: member.id },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      memberId: r.discussion_board_member_id as string & tags.Format<"uuid">,
      ip: r.ip === null ? null : r.ip,
      href: r.href,
      referrer: r.referrer,
      createdAt: toISOStringSafe(r.created_at),
      expiredAt: r.expired_at ? toISOStringSafe(r.expired_at) : null,
    }));

    const records = Number(total);
    const limit = Number(data.length);
    const current = 1;
    const pages = limit === 0 ? 0 : Math.ceil(records / limit);

    return {
      pagination: {
        current,
        limit,
        records,
        pages,
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
