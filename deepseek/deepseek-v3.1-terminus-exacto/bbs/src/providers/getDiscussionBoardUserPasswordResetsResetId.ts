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

export async function getDiscussionBoardUserPasswordResetsResetId(props: {
  user: UserPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserPasswordReset> {
  const resetRecord =
    await MyGlobal.prisma.discussion_board_user_password_resets.findUnique({
      where: {
        id: props.resetId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
      ...DiscussionBoardUserPasswordResetTransformer.select(),
    });
  if (!resetRecord) {
    throw new HttpException(
      "Password reset record not found or access denied",
      404,
    );
  }
  return await DiscussionBoardUserPasswordResetTransformer.transform(
    resetRecord,
  );
}
