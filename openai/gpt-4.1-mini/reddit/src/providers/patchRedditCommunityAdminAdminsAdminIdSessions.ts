import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import { IPageIRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.IRequest;
}): Promise<IPageIRedditCommunityAdminSession.ISummary> {
  const { admin, adminId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const where = {
    reddit_community_admin_id: adminId,
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? {
          OR: [
            { ip: { contains: body.search } },
            { href: { contains: body.search } },
            { referrer: { contains: body.search } },
          ],
        }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_admin_sessions.findMany({
      where,
      orderBy:
        body.sort_by !== undefined && body.sort_order !== undefined
          ? {
              [body.sort_by]: body.sort_order,
            }
          : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_admin_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      reddit_community_admin_id: session.reddit_community_admin_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
