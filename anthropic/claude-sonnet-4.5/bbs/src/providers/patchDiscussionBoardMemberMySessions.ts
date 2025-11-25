import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function patchDiscussionBoardMemberMySessions(props: {
  body: IDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (props.body.status === "active") {
      conditions.expired_at = null;
    } else if (props.body.status === "expired") {
      conditions.expired_at = { not: null };
    }

    if (props.body.created_after || props.body.created_before) {
      conditions.created_at = {};
      if (props.body.created_after) {
        (conditions.created_at as Record<string, unknown>).gte = new Date(
          props.body.created_after,
        );
      }
      if (props.body.created_before) {
        (conditions.created_at as Record<string, unknown>).lte = new Date(
          props.body.created_before,
        );
      }
    }

    if (props.body.ip_pattern) {
      conditions.ip = { contains: props.body.ip_pattern };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        member: true,
      },
    }),
    MyGlobal.prisma.discussion_board_member_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      ip: session.ip,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
      member: {
        id: session.member.id,
        username: session.member.username,
        display_name: session.member.display_name ?? null,
      },
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
