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

export async function deleteDiscussionBoardRegisteredUserEmailVerificationsEmailVerificationId(props: {
  registeredUser: RegistereduserPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (trx) => {
    await trx.discussion_board_registered_user_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.emailVerificationId },
      },
    );
    await trx.discussion_board_registered_user_email_verifications.delete({
      where: { id: props.emailVerificationId },
    });
  });
}
