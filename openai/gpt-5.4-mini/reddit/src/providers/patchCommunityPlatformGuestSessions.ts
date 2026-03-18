import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
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

export async function patchCommunityPlatformGuestSessions(props: {
  guest: GuestPayload;
}): Promise<IPageICommunityPlatformMemberSession> {
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findUnique({
      where: {
        id: props.guest.session_id,
      },
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
          },
        },
      },
    });
  if (session === null) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 0,
        records: 0,
        pages: 0,
      },
    };
  }
  return {
    data: [
      {
        id: session.id,
        member: {
          id: session.member.id,
        } satisfies ICommunityPlatformMember.ISummary,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        createdAt: session.created_at.toISOString(),
        expiredAt: session.expired_at.toISOString(),
      },
    ],
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
  };
}
