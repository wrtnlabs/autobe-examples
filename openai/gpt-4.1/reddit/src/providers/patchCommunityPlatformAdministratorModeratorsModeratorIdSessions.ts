import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import { IPageICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorModeratorsModeratorIdSessions(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorSession.IRequest;
}): Promise<IPageICommunityPlatformModeratorSession> {
  if (props.body.moderator_id !== props.moderatorId) {
    throw new HttpException("Moderator ID in path and body must match.", 400);
  }

  const page = props.body.page;
  const limit = Math.min(props.body.limit, 100);
  const skip = (page - 1) * limit;

  // Build session filter
  const where: any = {
    community_platform_moderator_id: props.moderatorId,
  };
  if (props.body.start_date) {
    where.created_at = { ...where.created_at, gte: props.body.start_date };
  }
  if (props.body.end_date) {
    where.created_at = { ...where.created_at, lte: props.body.end_date };
  }
  if (props.body.ip) {
    where.ip = props.body.ip;
  }
  if (props.body.status === "active") {
    where.OR = [
      { expired_at: null },
      { expired_at: { gt: toISOStringSafe(new Date()) } },
    ];
  } else if (props.body.status === "expired") {
    where.AND = [
      { expired_at: { not: null, lte: toISOStringSafe(new Date()) } },
    ];
  }

  // Batch fetch total and sessions
  const [total, sessions] = await Promise.all([
    MyGlobal.prisma.community_platform_moderator_sessions.count({ where }),
    MyGlobal.prisma.community_platform_moderator_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        moderator: { select: { id: true } },
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((row: any) => ({
      id: row.id,
      community_platform_moderator_id: row.community_platform_moderator_id,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: toISOStringSafe(row.created_at),
      expired_at: row.expired_at ? toISOStringSafe(row.expired_at) : undefined,
      moderator: { id: row.moderator.id },
    })),
  };
}
