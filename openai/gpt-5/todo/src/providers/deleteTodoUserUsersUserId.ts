import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, userId } = props;

  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );
  }

  try {
    await MyGlobal.prisma.todo_users.delete({
      where: { id: userId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new HttpException("Not Found", 404);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
