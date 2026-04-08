import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeMemberSessionTransformer } from "../transformers/RedditLikeMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeMemberSession> {
  // Verify session ownership
  const session =
    await MyGlobal.prisma.reddit_like_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: { reddit_like_member_id: true },
    });
  if (session.reddit_like_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve full session with member summary
  const record =
    await MyGlobal.prisma.reddit_like_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...RedditLikeMemberSessionTransformer.select(),
    });
  return await RedditLikeMemberSessionTransformer.transform(record);
}
