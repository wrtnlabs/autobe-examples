import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorSession";
import { IPageICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdministratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorAdministratorsAdministratorIdSessions(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdministratorSession.IRequest;
}): Promise<IPageICommunityPlatformAdministratorSession.ISummary> {
  // 1. Check administrator existence
  const admin =
    await MyGlobal.prisma.community_platform_administrators.findFirst({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }

  // 2. Parse pagination and filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortByOptions = ["created_at", "expired_at", "ip"];
  const sort_by: string = sortByOptions.includes(props.body.sort_by ?? "")
    ? props.body.sort_by!
    : "created_at";
  const order: "asc" | "desc" = props.body.order === "asc" ? "asc" : "desc";

  // 3. Build where condition
  const where: Record<string, unknown> = {
    community_platform_administrator_id: props.administratorId,
    ...(props.body.ip ? { ip: props.body.ip } : {}),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }
      : {}),
    ...(typeof props.body.expired === "boolean"
      ? props.body.expired
        ? { expired_at: { not: null } }
        : { expired_at: null }
      : {}),
  };

  // 4. Find sessions (pagination)
  const [sessions, records] = await Promise.all([
    MyGlobal.prisma.community_platform_administrator_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: order },
    }),
    MyGlobal.prisma.community_platform_administrator_sessions.count({ where }),
  ]);

  // 5. Format sessions
  const data = sessions.map((session) => ({
    id: session.id,
    administrator: { id: session.community_platform_administrator_id },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  // 6. Prepare pagination
  const pages = Math.ceil(records / limit);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: records satisfies number as number,
      pages: pages satisfies number as number,
    },
    data,
  };
}
