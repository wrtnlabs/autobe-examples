import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorUsersUserIdSessions(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserSession.IRequest;
}): Promise<IPageICommunityPlatformUserSession.ISummary> {
  const { status, from, to, ip, page = 1, limit = 20 } = props.body ?? {};

  // Build where condition functionally
  const where = {
    community_platform_user_id: props.userId,
    ...(status === "active" && { expired_at: null }),
    ...(status === "expired" && { expired_at: { not: null } }),
    ...(typeof ip === "string" && ip !== "" && { ip }),
    ...(from != null || to != null
      ? {
          created_at: {
            ...(from != null ? { gte: from } : {}),
            ...(to != null ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const take = Math.min(Math.max(limit ?? 20, 1), 100);
  const currentPage = Math.max(page ?? 1, 1);
  const skip = (currentPage - 1) * take;

  // Fetch data and total count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_user_sessions.count({
      where,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      created_at: toISOStringSafe(session.created_at),
    })),
    pagination: {
      current: currentPage,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
  };
}
