import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMemberSession";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditMemberSession.IRequest;
}): Promise<IPageIRedditMemberSession.ISummary> {
  const {
    page = 1,
    limit = 100,
    search,
    ip,
    href,
    referrer,
    created_at,
  } = props.body;
  const now = toISOStringSafe(new Date());
  const skip = (page - 1) * limit;
  const currentPage = Math.max(page, 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const currentLimit = Math.min(limit, 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const where: Prisma.reddit_guest_sessionsWhereInput = {
    expired_at: { gt: now },
    ...(search && {
      OR: [
        { ip: { contains: search } },
        { href: { contains: search } },
        { referrer: { contains: search } },
      ],
    }),
    ...(ip && { ip: { equals: ip } }),
    ...(href && { href: { equals: href } }),
    ...(referrer && { referrer: { equals: referrer } }),
    ...(created_at && { created_at: { gt: created_at } }),
  };
  const sessions = await MyGlobal.prisma.reddit_guest_sessions.findMany({
    where,
    skip,
    take: currentLimit,
    orderBy: { created_at: "desc" },
    // Removed non-existent guest include
  });
  const total = await MyGlobal.prisma.reddit_guest_sessions.count({
    where: {
      ...where,
      expired_at: { gt: now },
    },
  });
  const data = await Promise.all(
    sessions.map((session) => {
      return {
        id: session.id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        // Fixed date types
        created_at: toISOStringSafe(session.created_at),
        expired_at: toISOStringSafe(session.expired_at),
        // Using reddit_guest_id instead of non-existent guest relation
        member: {
          id: session.reddit_guest_id,
          email: "",
          created_at: "",
        },
      };
    }),
  );
  return {
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: Math.ceil(total / currentLimit),
    },
    data,
  };
}
