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
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberMembersMemberIdSessions(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberSession.ISummary> {
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden: You can only access your own sessions",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: {
        discussion_board_member_id: props.memberId,
        ...(props.body.ip !== undefined && { ip: props.body.ip }),
        ...(props.body.href !== undefined && {
          href: { contains: props.body.href },
        }),
        ...(props.body.referrer !== undefined && {
          referrer: { contains: props.body.referrer },
        }),
        ...((props.body.created_after !== undefined ||
          props.body.created_before !== undefined) && {
          created_at: {
            ...(props.body.created_after !== undefined && {
              gte: props.body.created_after,
            }),
            ...(props.body.created_before !== undefined && {
              lte: props.body.created_before,
            }),
          },
        }),
        ...(props.body.expired_at_is_null === true && { expired_at: null }),
        ...(props.body.expired_at_is_null === false && {
          expired_at: { not: null },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        created_at: props.body.sort === "created_at" ? "asc" : "desc",
      },
      include: {
        member: {
          select: {
            id: true,
            username: true,
            email: true,
            status: true,
            email_verified: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_member_sessions.count({
      where: {
        discussion_board_member_id: props.memberId,
        ...(props.body.ip !== undefined && { ip: props.body.ip }),
        ...(props.body.href !== undefined && {
          href: { contains: props.body.href },
        }),
        ...(props.body.referrer !== undefined && {
          referrer: { contains: props.body.referrer },
        }),
        ...((props.body.created_after !== undefined ||
          props.body.created_before !== undefined) && {
          created_at: {
            ...(props.body.created_after !== undefined && {
              gte: props.body.created_after,
            }),
            ...(props.body.created_before !== undefined && {
              lte: props.body.created_before,
            }),
          },
        }),
        ...(props.body.expired_at_is_null === true && { expired_at: null }),
        ...(props.body.expired_at_is_null === false && {
          expired_at: { not: null },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      discussion_board_member_id: session.discussion_board_member_id,
      member: {
        id: session.member.id,
        username: session.member.username,
        email: session.member.email,
        status: session.member.status,
        email_verified: session.member.email_verified,
        created_at: toISOStringSafe(session.member.created_at),
      },
      ip: session.ip,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
