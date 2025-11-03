import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postAuthMemberPasswordRequest(props: {
  body: IDiscussionBoardMember.IRequestPasswordReset;
}): Promise<void> {
  const { body } = props;

  // Extract commonly used fields (controller validated)
  const email = (body as { email?: string & tags.Format<"email"> }).email;
  const username = (body as { username?: string }).username;
  const request_ip = (body as { ip?: string | null }).ip ?? null;

  // Find member by email first, then username
  const member = email
    ? await MyGlobal.prisma.discussion_board_member.findUnique({
        where: { email },
      })
    : username
      ? await MyGlobal.prisma.discussion_board_member.findUnique({
          where: { username },
        })
      : null;

  // Non-enumeration: If no member, return success without persisting reset
  if (!member) return;

  // Rate limit: allow one request per minute (policy)
  const last = await MyGlobal.prisma.discussion_board_password_resets.findFirst(
    {
      where: { discussion_board_member_id: member.id },
      orderBy: { created_at: "desc" },
    },
  );

  if (last) {
    const elapsed = Date.now() - last.created_at.getTime();
    const windowMs = 60 * 1000; // 1 minute
    if (elapsed < windowMs) {
      throw new HttpException("Too Many Requests", 429);
    }
  }

  const now = toISOStringSafe(new Date());
  const expires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour

  await MyGlobal.prisma.discussion_board_password_resets.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id as string & tags.Format<"uuid">,
      token: v4(),
      request_ip: request_ip,
      created_at: now,
      expires_at: expires,
      consumed_at: null,
    },
  });

  // Note: Email dispatch is handled by other systems (background worker) based on the persisted reset record.
}
