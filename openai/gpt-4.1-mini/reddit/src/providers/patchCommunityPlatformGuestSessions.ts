import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
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
  body: ICommunityPlatformUserSession.IRequest;
}): Promise<IPageICommunityPlatformUserSession.ISummary> {
  // Use default pagination since page and limit are not in IRequest
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Use empty where filter because no filters exist in IRequest
  const where: Prisma.community_platform_user_sessionsWhereInput = {};
  const data = await MyGlobal.prisma.community_platform_user_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.community_platform_user_sessions.count({
    where,
  });
  return {
    data: data.map((session) => ({
      id: session.id,
      user_id: session.user_id,
      ip: session.ip,
      referer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
