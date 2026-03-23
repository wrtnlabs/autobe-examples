import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeMemberSessionTransformer } from "../transformers/RedditLikeMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorSessionsSessionId(props: {
  moderator: ModeratorPayload;
  sessionId: string;
}): Promise<IRedditLikeMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_like_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        ip: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        revoked_at: true,
        member_id: true,
      },
    });
  if (session.member_id !== props.moderator.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditLikeMemberSessionTransformer.transform(session);
}
