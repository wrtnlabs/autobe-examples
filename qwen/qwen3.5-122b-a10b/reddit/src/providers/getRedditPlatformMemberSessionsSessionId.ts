import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberSessionAtSummaryTransformer } from "../transformers/RedditPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMemberSession.ISummary> {
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: { reddit_platform_member_id: true },
    });
  if (session.reddit_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const fullSession =
    await MyGlobal.prisma.reddit_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...RedditPlatformMemberSessionAtSummaryTransformer.select(),
    });
  return await RedditPlatformMemberSessionAtSummaryTransformer.transform(
    fullSession,
  );
}
