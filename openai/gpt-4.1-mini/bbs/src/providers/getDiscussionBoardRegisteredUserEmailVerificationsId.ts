import { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
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

export async function getDiscussionBoardRegisteredUserEmailVerificationsId(props: {
  registeredUser: RegistereduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserEmailVerification> {
  const record =
    await MyGlobal.prisma.discussion_board_registered_user_email_verifications.findUnique(
      {
        where: { id: props.id },
        select: {
          id: true,
          registered_user_id: true,
          token: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!record) {
    throw new HttpException("Email verification token not found", 404);
  }
  return {
    id: record.id,
    registered_user_id: record.registered_user_id,
    token: record.token,
    expired_at: record.expired_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: record.deleted_at,
  };
}
