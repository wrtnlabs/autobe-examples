import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";
import { IPageIRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegisteredUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityRegisteredUsersIdRegisteredUserSessions(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUserSession.IRequest;
}): Promise<IPageIRedditCommunityRegisteredUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;

  const where = {
    user_id: props.id,
    ...(props.body.ip !== undefined && props.body.ip !== null
      ? { ip: props.body.ip }
      : {}),
    ...(props.body.referrer !== undefined && props.body.referrer !== null
      ? { referrer: props.body.referrer }
      : {}),
    ...(props.body.user_agent !== undefined && props.body.user_agent !== null
      ? { user_agent: props.body.user_agent }
      : {}),
  };

  let orderBy: Record<string, "asc" | "desc">;
  if (props.body.sort) {
    const [field, directionRaw] = props.body.sort.split(" ");
    const validFields = ["created_at", "last_active"];
    const validDirections = ["asc", "desc"] as const;
    if (
      !validFields.includes(field) ||
      !validDirections.includes(directionRaw as any)
    ) {
      throw new HttpException("Invalid sort parameter", 400);
    }
    const direction = directionRaw === "asc" ? "asc" : "desc";
    orderBy = {
      [field]: direction,
    };
  } else {
    orderBy = { created_at: "desc" };
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_registered_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_registered_user_sessions.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: sessions.map((session) => ({
      id: session.id,
      user_id:
        session.reddit_community_registered_user_id satisfies string as string &
          tags.Format<"uuid">,
      ip: session.ip === null ? undefined : session.ip,
      href: session.href,
      referrer:
        session.referrer === null || session.referrer === undefined
          ? ""
          : session.referrer,
      user_agent:
        "user_agent" in session &&
        session.user_agent !== null &&
        typeof session.user_agent === "string"
          ? session.user_agent
          : undefined,
      created_at: toISOStringSafe(session.created_at),
      updated_at:
        session.expired_at !== undefined && session.expired_at !== null
          ? toISOStringSafe(session.expired_at)
          : toISOStringSafe(new Date()),
    })),
  };
}
