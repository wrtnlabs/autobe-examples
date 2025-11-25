import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegistereduserSession";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityRegisteredusersRedditCommunityRegistereduserIdSessionsId(props: {
  registeredUser: RegistereduserPayload;
  redditCommunityRegistereduserId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRegistereduserSession.IUpdate;
}): Promise<IRedditCommunityRegistereduserSession> {
  const existing =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.findUnique({
      where: {
        id: props.id,
      },
    });

  if (
    !existing ||
    existing.reddit_community_registereduser_id !==
      props.redditCommunityRegistereduserId
  ) {
    throw new HttpException("Session not found", 404);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.update({
      where: {
        id: props.id,
      },
      data: {
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at:
          props.body.expired_at === undefined ? null : props.body.expired_at,
      },
    });

  return {
    id: updated.id,
    reddit_community_registereduser_id:
      updated.reddit_community_registereduser_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
