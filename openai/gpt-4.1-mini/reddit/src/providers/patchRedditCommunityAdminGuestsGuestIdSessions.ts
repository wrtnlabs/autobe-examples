import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import { IPageIRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminGuestsGuestIdSessions(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IRedditCommunityGuestSession.IRequest;
}): Promise<IPageIRedditCommunityGuestSession.ISummary> {
  const { admin, guestId, body } = props;

  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  const where = {
    reddit_community_guest_id: guestId,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { ip: { contains: body.search } },
          { href: { contains: body.search } },
          { referrer: { contains: body.search } },
        ],
      }),
    ...(body.createdFrom !== undefined &&
    body.createdFrom !== null &&
    body.createdTo !== undefined &&
    body.createdTo !== null
      ? {
          created_at: {
            gte: body.createdFrom,
            lte: body.createdTo,
          },
        }
      : {
          ...(body.createdFrom !== undefined &&
            body.createdFrom !== null && {
              created_at: {
                gte: body.createdFrom,
              },
            }),
          ...(body.createdTo !== undefined &&
            body.createdTo !== null && {
              created_at: {
                lte: body.createdTo,
              },
            }),
        }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_guest_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_guest_sessions.count({ where }),
  ]);

  const data = results.map((x) => ({
    id: x.id,
    ip: x.ip,
    href: x.href,
    referrer: x.referrer,
    created_at: toISOStringSafe(x.created_at),
    expired_at: x.expired_at ? toISOStringSafe(x.expired_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
