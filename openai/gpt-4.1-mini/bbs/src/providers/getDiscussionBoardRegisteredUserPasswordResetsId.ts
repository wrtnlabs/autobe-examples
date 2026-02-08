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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserPasswordResetsId(props: {
  registeredUser: RegistereduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserPasswordReset> {
  const record =
    await MyGlobal.prisma.discussion_board_registered_user_password_resets.findUnique(
      {
        where: { id: props.id },
      },
    );
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Password reset token not found", 404);
  }
  return {
    id: record.id,
    registered_user_id: record.registered_user_id,
    token: record.token,
    expired_at: toISOStringSafe(record.expired_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
