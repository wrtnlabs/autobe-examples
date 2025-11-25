import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoListTasksTaskId(props: {
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.todo_list_tasks.delete({
      where: { id: props.taskId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Task not found", 404);
    }
    throw error;
  }
}
