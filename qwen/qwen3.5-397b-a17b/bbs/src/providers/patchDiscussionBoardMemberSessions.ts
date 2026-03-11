import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
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

export async function patchDiscussionBoardMemberSessions(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    ...(props.body.search !== undefined && {
      member: {
        display_name: {
          contains: props.body.search,
        },
      },
    }),
    ...(props.body.user_id !== undefined && {
      discussion_board_member_id: props.body.user_id,
    }),
    ...(props.body.ip !== undefined && {
      ip: {
        contains: props.body.ip,
      },
    }),
    ...(props.body.status !== undefined && {
      expired_at: props.body.status === "active" ? { gt: now } : { lte: now },
    }),
    ...(props.body.created_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_from),
      },
    }),
    ...(props.body.created_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_to),
      },
    }),
    ...(props.body.expired_from !== undefined && {
      expired_at: {
        gte: new Date(props.body.expired_from),
      },
    }),
    ...(props.body.expired_to !== undefined && {
      expired_at: {
        lte: new Date(props.body.expired_to),
      },
    }),
  } satisfies Prisma.discussion_board_member_sessionsWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.discussion_board_member_sessionsOrderByWithRelationInput;
  const sessions =
    await MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        ip: true,
        created_at: true,
        expired_at: true,
        member: {
          select: {
            display_name: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.discussion_board_member_sessions.count({
    where: whereInput,
  });
  const data = sessions.map((session) => {
    const expiredAt = toISOStringSafe(session.expired_at);
    const isActive = session.expired_at > now;
    return {
      id: session.id as string & tags.Format<"uuid">,
      userType: "member" as const,
      displayName: session.member.display_name,
      ipAddress: session.ip,
      createdAt: toISOStringSafe(session.created_at),
      expiredAt: expiredAt,
      status: (isActive ? "active" : "expired") as "active" | "expired",
    } satisfies IDiscussionBoardAdminSession.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
