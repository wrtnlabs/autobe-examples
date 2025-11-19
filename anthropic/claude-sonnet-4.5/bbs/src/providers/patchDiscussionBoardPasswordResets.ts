import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

export async function patchDiscussionBoardPasswordResets(props: {
  body: IDiscussionBoardPasswordReset.ICreate;
}): Promise<IDiscussionBoardPasswordReset> {
  const { actor_type, email } = props.body;

  // Verify the email exists in the appropriate table
  let accountId: string | null = null;

  if (actor_type === "member") {
    const member = await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { email },
      select: { id: true },
    });
    if (member) {
      accountId = member.id;
    }
  } else if (actor_type === "moderator") {
    const moderator =
      await MyGlobal.prisma.discussion_board_moderators.findUnique({
        where: { email },
        select: { id: true },
      });
    if (moderator) {
      accountId = moderator.id;
    }
  }

  // Security: Don't reveal whether email exists to prevent account enumeration
  if (!accountId) {
    throw new HttpException(
      "If the email exists, a password reset link will be sent.",
      200,
    );
  }

  // Generate cryptographically secure token
  const resetId = v4();
  const token = require("crypto").randomBytes(32).toString("hex");
  const nowTimestamp = Date.now();
  const expiresAtTimestamp = nowTimestamp + 60 * 60 * 1000; // 1 hour from now
  const nowISO = toISOStringSafe(new Date(nowTimestamp));
  const expiresAtISO = toISOStringSafe(new Date(expiresAtTimestamp));

  // Invalidate previous active reset tokens for this account
  if (actor_type === "member") {
    const previousResets =
      await MyGlobal.prisma.discussion_board_password_reset_of_members.findMany(
        {
          where: { discussion_board_member_id: accountId },
          select: {
            discussion_board_password_reset_id: true,
          },
        },
      );

    if (previousResets.length > 0) {
      await MyGlobal.prisma.discussion_board_password_resets.updateMany({
        where: {
          id: {
            in: previousResets.map((r) => r.discussion_board_password_reset_id),
          },
          used_at: null,
          expires_at: { gt: nowISO },
        },
        data: { used_at: nowISO },
      });
    }
  } else {
    const previousResets =
      await MyGlobal.prisma.discussion_board_password_reset_of_moderators.findMany(
        {
          where: { discussion_board_moderator_id: accountId },
          select: {
            discussion_board_password_reset_id: true,
          },
        },
      );

    if (previousResets.length > 0) {
      await MyGlobal.prisma.discussion_board_password_resets.updateMany({
        where: {
          id: {
            in: previousResets.map((r) => r.discussion_board_password_reset_id),
          },
          used_at: null,
          expires_at: { gt: nowISO },
        },
        data: { used_at: nowISO },
      });
    }
  }

  // Create password reset record and subtype record in transaction
  const resetRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    const reset = await tx.discussion_board_password_resets.create({
      data: {
        id: resetId,
        actor_type,
        token,
        email,
        expires_at: expiresAtISO,
        used_at: null,
        created_at: nowISO,
      },
    });

    if (actor_type === "member") {
      await tx.discussion_board_password_reset_of_members.create({
        data: {
          id: v4(),
          discussion_board_password_reset_id: resetId,
          discussion_board_member_id: accountId,
          created_at: nowISO,
        },
      });
    } else {
      await tx.discussion_board_password_reset_of_moderators.create({
        data: {
          id: v4(),
          discussion_board_password_reset_id: resetId,
          discussion_board_moderator_id: accountId,
          created_at: nowISO,
        },
      });
    }

    return reset;
  });

  return {
    id: resetRecord.id,
    actor_type: typia.assert<"member" | "moderator">(resetRecord.actor_type),
    token: resetRecord.token,
    email: resetRecord.email,
    expires_at: toISOStringSafe(resetRecord.expires_at),
    used_at: resetRecord.used_at ? toISOStringSafe(resetRecord.used_at) : null,
    created_at: toISOStringSafe(resetRecord.created_at),
  };
}
