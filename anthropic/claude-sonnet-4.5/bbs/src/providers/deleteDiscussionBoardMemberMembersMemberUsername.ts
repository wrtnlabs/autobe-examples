import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberMembersMemberUsername(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardMember.IDeleteRequest;
}): Promise<void> {
  const { member, memberUsername, body } = props;

  const memberAccount =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        username: memberUsername,
        deleted_at: null,
      },
    });

  if (!memberAccount) {
    throw new HttpException("Member account not found or already deleted", 404);
  }

  if (memberAccount.id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );
  }

  if (memberAccount.status !== "active") {
    throw new HttpException(
      "Cannot delete account: account status is not active",
      400,
    );
  }

  const passwordValid = await PasswordUtil.verify(
    body.password,
    memberAccount.password_hash,
  );

  if (!passwordValid) {
    throw new HttpException(
      "Invalid password provided for account deletion",
      401,
    );
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: memberAccount.id },
    data: {
      deleted_at: deletedAt,
      status: "deleted",
    },
  });
}
