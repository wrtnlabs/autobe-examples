import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorRegisteredUsersUserId(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardRegisteredUser.IUpdate;
}): Promise<IDiscussionBoardRegisteredUser> {
  const existingUser =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.userId },
    });
  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }
  let updateBody: any;
  try {
    updateBody = JSON.parse(props.body as string);
  } catch (error) {
    throw new HttpException("Invalid update data", 400);
  }
  const updateData: Prisma.discussion_board_registered_usersUpdateInput = {
    ...(updateBody.email !== undefined && { email: updateBody.email }),
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedUser =
    await MyGlobal.prisma.discussion_board_registered_users.update({
      where: { id: props.userId },
      data: updateData,
    });
  return {
    id: updatedUser.id satisfies string as string & tags.Format<"uuid">,
    email: updatedUser.email,
  } satisfies IDiscussionBoardRegisteredUser;
}
