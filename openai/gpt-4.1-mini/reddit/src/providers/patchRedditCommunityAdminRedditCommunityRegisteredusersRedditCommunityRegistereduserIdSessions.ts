import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";
import { IPageIRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegistereduserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityRegisteredusersRedditCommunityRegistereduserIdSessions(props: {
  admin: AdminPayload;
  redditCommunityRegistereduserId: string & tags.Format<"uuid">;
  body: IRedditCommunityRegistereduserSession.IRequest;
}): Promise<IPageIRedditCommunityRegistereduserSession.ISummary> {
  const nowIso = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;

  const where = {
    reddit_community_registereduser_id: props.redditCommunityRegistereduserId,
    ...(props.body.filter?.created_after
      ? { created_at: { gte: props.body.filter.created_after } }
      : {}),
    ...(props.body.filter?.expired !== undefined &&
    props.body.filter?.expired !== null
      ? props.body.filter.expired
        ? { expired_at: { lt: nowIso } }
        : { expired_at: null }
      : {}),
    ...(props.body.filter?.ip ? { ip: props.body.filter.ip } : {}),
    ...(props.body.filter?.referrer
      ? { referrer: { contains: props.body.filter.referrer } }
      : {}),
    ...(props.body.filter?.href
      ? { href: { contains: props.body.filter.href } }
      : {}),
  };

  const limit = props.body.limit ?? 100;

  const orderBy = props.body.order_by
    ? { [props.body.order_by]: "asc" as "asc" }
    : { created_at: "asc" as "asc" };

  const cursorWhere: Record<string, unknown> | undefined = props.body.after_id
    ? { id: { gt: props.body.after_id } }
    : props.body.before_id
      ? { id: { lt: props.body.before_id } }
      : undefined;

  const findManyWhere = { ...where, ...cursorWhere };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_registereduser_sessions.findMany({
      where: findManyWhere,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_registereduser_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    })),
  };
}
