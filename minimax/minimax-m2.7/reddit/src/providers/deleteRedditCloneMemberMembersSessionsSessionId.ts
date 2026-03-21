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

export async function deleteRedditCloneMemberMembersSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify session exists and belongs to the authenticated member
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      id: props.sessionId,
      reddit_clone_member_id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  // Return 404 (not 403) to prevent session enumeration attacks
  if (!session) {
    throw new HttpException("Not Found", 404);
  }
  // Delete the session - CASCADE relation ensures no orphaned tokens remain
  await MyGlobal.prisma.reddit_clone_member_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
