import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardRegisteredUserPasswordResetTransformer } from "../transformers/DiscussionBoardRegisteredUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserPasswordResets(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserPasswordReset.IPatch;
}): Promise<IDiscussionBoardRegisteredUserPasswordReset> {
  function getCurrentISOString(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  const now: string & tags.Format<"date-time"> = getCurrentISOString();
  const resetTokenRecord =
    await MyGlobal.prisma.discussion_board_registered_user_password_resets.findFirst(
      {
        where: {
          token: props.body.token,
          expired_at: { gt: now },
          deleted_at: null,
        },
        include: { registeredUser: true },
      },
    );
  if (!resetTokenRecord) {
    throw new HttpException("Invalid or expired reset token", 400);
  }
  if (props.body.password === null || props.body.password === undefined) {
    throw new HttpException("Password must be provided", 400);
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.discussion_board_registered_users.update({
    where: { id: resetTokenRecord.registered_user_id },
    data: { password_hash: newPasswordHash, updated_at: now },
  });
  await MyGlobal.prisma.discussion_board_registered_user_password_resets.update(
    {
      where: { id: resetTokenRecord.id },
      data: { deleted_at: now },
    },
  );
  const resetRecord =
    await MyGlobal.prisma.discussion_board_registered_user_password_resets.findUniqueOrThrow(
      {
        where: { id: resetTokenRecord.id },
        ...DiscussionBoardRegisteredUserPasswordResetTransformer.select(),
      },
    );
  return await DiscussionBoardRegisteredUserPasswordResetTransformer.transform(
    resetRecord,
  );
}
