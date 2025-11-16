import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberMembersUsernameSessionsSessionId(props: {
  member: MemberPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: {
      id: props.member.id,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  if (member.username !== props.username) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_member_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Session not found", 404);
  }

  await MyGlobal.prisma.reddit_community_member_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
