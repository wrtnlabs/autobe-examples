import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getDiscussionBoardRegisteredUserRegisteredUsersUserId(props: {
  registeredUser: RegisteredUserPayload;
  userId: string;
}): Promise<IDiscussionBoardRegisteredUser> {
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.userId },
    });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Authorization check: Ensure the requesting user is the same as the target user
  if (props.registeredUser.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  const result: IDiscussionBoardRegisteredUser = {
    id: user.id,
    email: user.email,
    name: user.username, // Assuming 'username' is the correct field for 'name'
  };

  return result;
}
