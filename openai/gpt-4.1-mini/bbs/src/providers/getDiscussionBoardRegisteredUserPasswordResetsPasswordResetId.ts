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

export async function getDiscussionBoardRegisteredUserPasswordResetsPasswordResetId(props: {
  registeredUser: RegistereduserPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserPasswordReset> {
  const passwordResetRecord =
    await MyGlobal.prisma.discussion_board_registered_user_password_resets.findUniqueOrThrow(
      {
        where: { id: props.passwordResetId },
        ...DiscussionBoardRegisteredUserPasswordResetTransformer.select(),
      },
    );
  return await DiscussionBoardRegisteredUserPasswordResetTransformer.transform(
    passwordResetRecord,
  );
}
