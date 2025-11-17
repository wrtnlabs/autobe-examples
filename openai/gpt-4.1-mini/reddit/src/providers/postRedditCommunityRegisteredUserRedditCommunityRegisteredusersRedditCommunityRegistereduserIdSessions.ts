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

export async function postRedditCommunityRegisteredUserRedditCommunityRegisteredusersRedditCommunityRegistereduserIdSessions(props: {
  registeredUser: RegistereduserPayload;
  redditCommunityRegistereduserId: string & tags.Format<"uuid">;
  body: IRedditCommunityRegistereduserSession.ICreate;
}): Promise<IRedditCommunityRegistereduserSession> {
  if (props.registeredUser.id !== props.redditCommunityRegistereduserId) {
    throw new HttpException("Forbidden", 403);
  }

  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.create({
      data: {
        id,
        reddit_community_registereduser_id:
          props.redditCommunityRegistereduserId,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: props.body.created_at,
        expired_at: props.body.expired_at ?? null,
      },
    });

  return {
    id: created.id,
    reddit_community_registereduser_id:
      created.reddit_community_registereduser_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
