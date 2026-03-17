import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
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

export async function patchRedditCloneMemberSessions(props: {
  member: MemberPayload;
  body: IRedditCloneMemberSession.IRequest;
}): Promise<IPageIRedditCloneMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const whereInput: Prisma.reddit_clone_member_sessionsWhereInput = {
    member_id: props.member.id,
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
    ...(props.body.expired_at_from || props.body.expired_at_to
      ? {
          expired_at: {
            ...(props.body.expired_at_from && {
              gte: new Date(props.body.expired_at_from),
            }),
            ...(props.body.expired_at_to && {
              lte: new Date(props.body.expired_at_to),
            }),
          },
        }
      : {}),
    ...(props.body.ip !== undefined
      ? { ip: { startsWith: props.body.ip } }
      : {}),
    ...(props.body.expired !== undefined
      ? props.body.expired
        ? { expired_at: { lt: new Date() } }
        : { expired_at: { gte: new Date() } }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { ip: { contains: props.body.search } },
            { href: { contains: props.body.search } },
            { referrer: { contains: props.body.search } },
          ],
        }
      : {}),
  };
  const orderByInput: Prisma.reddit_clone_member_sessionsOrderByWithRelationInput =
    sort === "expired_at" ? { expired_at: order } : { created_at: order };
  const data = await MyGlobal.prisma.reddit_clone_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      member: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
          created_at: true,
        },
      },
    },
  } satisfies Prisma.reddit_clone_member_sessionsFindManyArgs);
  const total = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: whereInput,
  });
  return {
    data: data.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: session.created_at.toISOString(),
      expired_at: session.expired_at.toISOString(),
      member: {
        id: session.member.id,
        username: session.member.username,
        display_name: session.member.display_name,
        avatar:
          session.member.avatar === null ? undefined : session.member.avatar,
        karma_score: 0,
        created_at: session.member.created_at.toISOString(),
      } satisfies IRedditCloneMember.ISummary,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
