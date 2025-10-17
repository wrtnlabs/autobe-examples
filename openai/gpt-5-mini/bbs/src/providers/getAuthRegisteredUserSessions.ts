import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getAuthRegisteredUserSessions(props: {
  registeredUser: RegistereduserPayload;
}): Promise<IEconPoliticalForumRegisteredUser.ISessionList> {
  const { registeredUser } = props;

  // Authorization sanity-check: ensure the caller's registered user still exists and is active
  const user =
    await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
      where: { id: registeredUser.id },
      select: { id: true, is_banned: true, deleted_at: true },
    });

  if (!user || user.deleted_at !== null || user.is_banned) {
    throw new HttpException("Unauthorized: invalid registered user", 403);
  }

  try {
    const sessions =
      await MyGlobal.prisma.econ_political_forum_sessions.findMany({
        where: {
          registereduser_id: registeredUser.id,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          created_at: true,
          last_active_at: true,
          expires_at: true,
          ip_address: true,
          user_agent: true,
        },
      });

    const data = sessions.map((s) => {
      return {
        id: s.id as string & tags.Format<"uuid">,
        created_at: toISOStringSafe(s.created_at),
        last_active_at: s.last_active_at
          ? toISOStringSafe(s.last_active_at)
          : null,
        expires_at: toISOStringSafe(s.expires_at),
        ip_address: s.ip_address ?? null,
        user_agent: s.user_agent ?? null,
      } as IEconPoliticalForumRegisteredUser.ISession;
    });

    const pagination = {
      current: Number(1),
      limit: Number(data.length),
      records: Number(data.length),
      pages: Number(1),
    } satisfies IPage.IPagination;

    return { pagination, data };
  } catch (err) {
    // For security, do not leak internal error details in production messages
    throw new HttpException("Internal Server Error", 500);
  }
}
