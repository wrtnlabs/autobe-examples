import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.reddit_clone_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        reddit_clone_member_id: true,
      },
    });
  if (session.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_clone_member_sessions.delete({
    where: { id: props.sessionId },
  });
}
