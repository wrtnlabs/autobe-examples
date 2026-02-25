import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserPasswordResetTransformer } from "../transformers/DiscussionBoardUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserUsersPasswordResetsResetId(props: {
  user: UserPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserPasswordReset> {
  const reset =
    await MyGlobal.prisma.discussion_board_user_password_resets.findFirstOrThrow(
      {
        where: {
          id: props.resetId,
          deleted_at: null, // Ensure not soft-deleted
          user: {
            // Ensure the password reset record belongs to the authenticated user
            id: props.user.id,
          },
        },
        ...DiscussionBoardUserPasswordResetTransformer.select(),
      },
    );
  // Validate that the token hasn't expired
  if (new Date() > new Date(reset.expired_at)) {
    throw new HttpException("Password reset token has expired", 410);
  }
  return await DiscussionBoardUserPasswordResetTransformer.transform(reset);
}
