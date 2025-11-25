import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function postDiscussionBoardAdminUserMemberUsersMemberUserIdRestriction(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberuserRestriction.ICreate;
}): Promise<IDiscussionBoardMemberuserRestriction> {
  const memberUser =
    await MyGlobal.prisma.discussion_board_memberusers.findFirst({
      where: {
        id: props.memberUserId,
        deleted_at: null,
      },
    });

  if (memberUser === null) {
    throw new HttpException("Member user not found", 404);
  }

  if (memberUser.account_status !== "active") {
    throw new HttpException(
      "Restriction can only be applied to member users in active status",
      400,
    );
  }

  const existingRestriction =
    await MyGlobal.prisma.discussion_board_memberuser_restrictions.findFirst({
      where: {
        discussion_board_memberuser_id: props.memberUserId,
      },
    });

  if (existingRestriction !== null) {
    throw new HttpException(
      "Restriction already exists for this member user. Use the update endpoint instead.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  let created:
    | (typeof MyGlobal.prisma.discussion_board_memberuser_restrictions extends {
        create: (args: infer A) => Promise<infer R>;
      }
        ? R
        : never)
    | null = null;

  try {
    created =
      await MyGlobal.prisma.discussion_board_memberuser_restrictions.create({
        data: {
          id: v4(),
          discussion_board_memberuser_id: props.memberUserId,
          restriction_level: props.body.restriction_level,
          reason_category: props.body.reason_category,
          started_at: props.body.started_at,
          ended_at:
            props.body.ended_at === undefined ? null : props.body.ended_at,
          created_at: now,
          updated_at: now,
        },
      });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint on discussion_board_memberuser_id violated
      throw new HttpException(
        "Restriction already exists for this member user. Use the update endpoint instead.",
        409,
      );
    }
    throw error;
  }

  const memberSummary: IDiscussionBoardMemberuser.ISummary = {
    id: memberUser.id,
    display_name: memberUser.display_name,
    account_status: memberUser.account_status,
    created_at: toISOStringSafe(memberUser.created_at),
  };

  return {
    id: created.id,
    restriction_level: created.restriction_level,
    reason_category: created.reason_category,
    started_at: toISOStringSafe(created.started_at),
    ended_at:
      created.ended_at === null ? null : toISOStringSafe(created.ended_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    memberUser: memberSummary,
  };
}
