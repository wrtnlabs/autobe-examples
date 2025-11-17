import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityRegisteredusersRedditCommunityRegistereduserIdSessionsId(props: {
  registeredUser: RegistereduserPayload;
  redditCommunityRegistereduserId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityRegistereduserSession> {
  const session =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.findUnique({
      where: {
        id: props.id,
        reddit_community_registereduser_id:
          props.redditCommunityRegistereduserId,
      },
    });

  if (session === null) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    reddit_community_registereduser_id:
      session.reddit_community_registereduser_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null || session.expired_at === undefined
        ? null
        : toISOStringSafe(session.expired_at),
  };
}
