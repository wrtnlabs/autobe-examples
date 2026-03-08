import { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardMemberPasswordResetTransformer } from "../transformers/DiscussionBoardMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string;
}): Promise<IDiscussionBoardMemberPasswordReset> {
  // Query the password reset record by token (resetId is the token value)
  const reset =
    await MyGlobal.prisma.discussion_board_member_password_resets.findUniqueOrThrow(
      {
        where: {
          token: props.resetId,
        },
        ...DiscussionBoardMemberPasswordResetTransformer.select(),
      },
    );
  // Validate token has not expired
  const now = new Date();
  if (reset.expired_at < now) {
    throw new HttpException("Password reset token has expired", 400);
  }
  // Transform and return the result
  return await DiscussionBoardMemberPasswordResetTransformer.transform(reset);
}
