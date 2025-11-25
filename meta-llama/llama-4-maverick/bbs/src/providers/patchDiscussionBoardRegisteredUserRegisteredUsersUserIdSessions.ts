import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function patchDiscussionBoardRegisteredUserRegisteredUsersUserIdSessions(props: {
  registeredUser: RegisteredUserPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardRegisteredUserSession.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUserSession.ISummary> {
  const { userId, body } = props;
  const limit = body.limit ?? 100;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.discussion_board_registered_user_sessionsWhereInput =
    {
      registered_user_id: userId,
      ...(body.status && { status: body.status }),
      ...(body.search && {
        OR: [
          { id: { equals: body.search } },
          { href: { contains: body.search } },
          { referrer: { contains: body.search } },
          { ip: { contains: body.search } },
        ],
      }),
    };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_registered_user_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [body.sortBy ?? "created_at"]: body.order ?? "desc" },
    }),
    MyGlobal.prisma.discussion_board_registered_user_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((session) => ({
      id: session.id,
      registered_user_id: session.registered_user_id,
      href: session.href,
      referrer: session.referrer,
      ip: session.ip,
      created_at: toISOStringSafe(session.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
