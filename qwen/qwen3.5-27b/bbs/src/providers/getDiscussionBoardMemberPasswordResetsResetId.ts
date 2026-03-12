import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPasswordReset";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function getDiscussionBoardMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorPasswordReset> {
  // First, try to find in member password resets table
  const memberReset =
    await MyGlobal.prisma.discussion_board_member_password_resets.findUnique({
      where: { id: props.resetId },
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        user_agent: true,
        ip_address: true,
        discussion_board_members_id: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            banned: true,
            created_at: true,
          },
        },
      },
    });
  if (memberReset) {
    // Verify ownership - member can only view their own password reset tokens
    if (memberReset.discussion_board_members_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    return {
      id: memberReset.id,
      token: memberReset.token,
      created_at: toISOStringSafe(memberReset.created_at),
      expired_at: toISOStringSafe(memberReset.expired_at),
      used_at: memberReset.used_at
        ? toISOStringSafe(memberReset.used_at)
        : null,
      user_agent: memberReset.user_agent,
      ip_address: memberReset.ip_address,
      token_type: null,
      updated_at: null,
      owner: {
        id: memberReset.member.id,
        email: memberReset.member.email,
        display_name: memberReset.member.display_name,
        banned: memberReset.member.banned,
        created_at: toISOStringSafe(memberReset.member.created_at),
      } satisfies IDiscussionBoardMember.ISummary,
    } satisfies IDiscussionBoardAdministratorPasswordReset;
  }
  // Try to find in administrator password resets table
  const adminReset =
    await MyGlobal.prisma.discussion_board_administrator_password_resets.findUnique(
      {
        where: { id: props.resetId },
        select: {
          id: true,
          token: true,
          created_at: true,
          expires_at: true,
          used_at: true,
          token_type: true,
          updated_at: true,
          administrator: {
            select: {
              id: true,
              email: true,
              display_name: true,
              bio: true,
              grade: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    );
  if (adminReset) {
    // Members cannot view administrator password reset tokens
    throw new HttpException("Forbidden", 403);
  }
  // Not found in either table - throw 404
  throw new HttpException("Not Found", 404);
}
