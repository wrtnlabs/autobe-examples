import { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardRegisteredUserPasswordResetCollector } from "../collectors/DiscussionBoardRegisteredUserPasswordResetCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserPasswordResets(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserPasswordReset.ICreate;
}): Promise<IDiscussionBoardRegisteredUserPasswordReset.ICreate> {
  const createData =
    await DiscussionBoardRegisteredUserPasswordResetCollector.collect({
      body: props.body,
      registeredUser: { id: props.registeredUser.id },
    });
  const inserted =
    await MyGlobal.prisma.discussion_board_registered_user_password_resets.create(
      {
        data: createData,
      },
    );
  return {
    token: inserted.token,
    expired_at: inserted.expired_at.toISOString(),
  };
}
