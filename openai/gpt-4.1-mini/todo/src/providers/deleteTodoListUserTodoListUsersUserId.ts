import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoListUserTodoListUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.todo_list_users.delete({
      where: { id: props.userId },
    });
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      throw new HttpException("User not found", 404);
    }
    throw error;
  }
}
