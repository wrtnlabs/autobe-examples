import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoUserSessions(props: {
  user: UserPayload;
  body: IMultiUserTodoUserSession.IRequest;
}): Promise<IPageIMultiUserTodoUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 100;
  const nowISO = toISOStringSafe(new Date());
  const where: Prisma.multi_user_todo_user_sessionsWhereInput = {
    user: { id: props.user.id },
  };
  if (props.body.expired !== undefined) {
    if (props.body.expired) {
      where.expired_at = { lte: nowISO };
    } else {
      where.OR = [
        { expired_at: { gt: nowISO } },
        { expired_at: { equals: undefined } },
      ];
    }
  }
  if (props.body.deleted !== undefined) {
    if (props.body.deleted) {
      where.deleted_at = { not: undefined };
    } else {
      where.deleted_at = { equals: undefined };
    }
  }
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
  ) {
    where.created_at = {};
    if (props.body.createdAtFrom !== undefined) {
      where.created_at.gte = props.body.createdAtFrom;
    }
    if (props.body.createdAtTo !== undefined) {
      where.created_at.lte = props.body.createdAtTo;
    }
  }
  if (
    props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
  ) {
    where.expired_at = {};
    if (props.body.expiredAtFrom !== undefined) {
      where.expired_at.gte = props.body.expiredAtFrom;
    }
    if (props.body.expiredAtTo !== undefined) {
      where.expired_at.lte = props.body.expiredAtTo;
    }
  }
  const skip = (page - 1) * limit;
  const sessions = await MyGlobal.prisma.multi_user_todo_user_sessions.findMany(
    {
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
      },
    },
  );
  const total = await MyGlobal.prisma.multi_user_todo_user_sessions.count({
    where,
  });
  const data: IMultiUserTodoUserSession.ISummary[] = sessions.map((s) => ({
    id: s.id,
    ip: s.ip,
    href: s.href,
    referrer: s.referrer ?? null,
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
    deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : null,
    expired_at: toISOStringSafe(s.expired_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
