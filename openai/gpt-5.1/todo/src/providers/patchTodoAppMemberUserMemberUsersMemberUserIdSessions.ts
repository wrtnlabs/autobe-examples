import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import { IPageITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function patchTodoAppMemberUserMemberUsersMemberUserIdSessions(props: {
  memberUser: MemberuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: ITodoAppMemberuserSession.IRequest;
}): Promise<IPageITodoAppMemberuserSession.ISummary> {
  // Authorization: ensure the authenticated member user matches the target memberUserId
  if (props.memberUser.id !== props.memberUserId) {
    throw new HttpException("Forbidden", 403);
  }

  const page: number = props.body.page;
  const limit: number = props.body.limit;
  const skip: number = (page - 1) * limit;

  // Ensure the target member user exists and is not logically deleted
  const memberUserRecord = await MyGlobal.prisma.todo_app_memberusers.findFirst(
    {
      where: {
        id: props.memberUserId,
        deleted_at: null,
      },
    },
  );

  if (memberUserRecord === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Build created_at range condition if any bound is provided
  const createdAtCondition = (() => {
    const hasFrom =
      props.body.createdFrom !== undefined && props.body.createdFrom !== null;
    const hasTo =
      props.body.createdTo !== undefined && props.body.createdTo !== null;

    if (!hasFrom && !hasTo) {
      return {};
    }

    return {
      created_at: {
        ...(hasFrom ? { gte: new Date(props.body.createdFrom as string) } : {}),
        ...(hasTo ? { lte: new Date(props.body.createdTo as string) } : {}),
      },
    };
  })();

  const whereCondition = {
    todo_app_memberuser_id: props.memberUserId,
    ...createdAtCondition,
    ...(props.body.activeOnly === true
      ? {
          OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
        }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_memberuser_sessions.findMany({
      where: whereCondition,
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_memberuser_sessions.count({
      where: whereCondition,
    }),
  ]);

  const data: ITodoAppMemberuserSession.ISummary[] = sessions.map((session) => {
    const createdAtIso: string & tags.Format<"date-time"> = toISOStringSafe(
      session.created_at,
    );
    const expiredAtIso: (string & tags.Format<"date-time">) | null =
      session.expired_at !== null ? toISOStringSafe(session.expired_at) : null;

    return {
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: createdAtIso,
      expired_at: expiredAtIso,
    };
  });

  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
