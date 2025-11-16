import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppTaskDescription } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskDescription";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserTasks(props: {
  user: UserPayload;
  body: ITodoAppTask.ICreate;
}): Promise<ITodoAppTask> {
  // Extract description value properly from ITodoAppTaskDescription.IFull type
  const descriptionValue =
    props.body.description?.type === "full"
      ? JSON.stringify(props.body.description.content)
      : typeof props.body.description === "string"
        ? props.body.description
        : props.body.description
          ? JSON.stringify(props.body.description)
          : null;

  // Create the new task with default pending status
  const created = await MyGlobal.prisma.todo_app_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: props.body.title,
      description: descriptionValue satisfies string | null as string | null,
      status: "pending",
      todo_app_user_id: props.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Get the user summary for the return
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    status: created.status,
    user: {
      id: user.id,
      email: user.email,
    },
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
