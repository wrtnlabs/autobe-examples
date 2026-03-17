import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
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

export async function patchCommunityPlatformMemberSessions(props: {
  member: MemberPayload;
  body: ICommunityPlatformGuestSession.IRequest;
}): Promise<IPageICommunityPlatformGuestSession.ISummary> {
  // Verify member is admin (only admins can access)
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.member.id, deleted_at: null },
  });
  if (!admin) {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Apply status filter (active/expired)
  const now = new Date().toISOString();
  const status = props.body.status;
  const expiredCondition =
    status === "active"
      ? { expired_at: { gt: now } }
      : status === "expired"
        ? { expired_at: { lte: now } }
        : {};
  // Apply creation date range
  const whereGuest: Prisma.community_platform_guest_sessionsWhereInput = {
    ...expiredCondition,
    ...(props.body.createdAtStart && {
      created_at: { gte: props.body.createdAtStart },
    }),
    ...(props.body.createdAtEnd && {
      created_at: { lte: props.body.createdAtEnd },
    }),
  };
  const [guestSessions, total] = await Promise.all([
    MyGlobal.prisma.community_platform_guest_sessions.findMany({
      where: whereGuest,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: { guest: true },
    }),
    MyGlobal.prisma.community_platform_guest_sessions.count({
      where: whereGuest,
    }),
  ]);
  // Transform using transformer if available
  // For now manual transform
  const data = await ArrayUtil.asyncMap(guestSessions, async (session) => {
    const guest =
      await MyGlobal.prisma.community_platform_guests.findUniqueOrThrow({
        where: { id: session.community_platform_guest_id },
      });
    return {
      id: session.id,
      ip: session.ip as string & tags.Format<"ipv4">,
      href: session.href as string & tags.Format<"uri">,
      referrer: session.referrer as string & tags.Format<"uri">,
      created_at: toISOStringSafe(session.created_at) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(
        session.expired_at ?? new Date("9999-12-31T23:59:59.999Z"),
      ) as string & tags.Format<"date-time">,
      guest: {
        id: guest.id,
        anonymous_id: guest.anonymous_id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(guest.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(guest.updated_at) as string &
          tags.Format<"date-time">,
      } satisfies ICommunityPlatformGuest.ISummary,
    } satisfies ICommunityPlatformGuestSession.ISummary;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformGuestSession.ISummary;
}
