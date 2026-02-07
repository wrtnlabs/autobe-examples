import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserProfile(props: {
  user: UserPayload;
  body: ITodoAppProfile.IUpdate;
}): Promise<void> {
  // Update the profile with the current timestamp
  // Since ITodoAppProfile.IUpdate is {} per DTO schema, no input data is provided
  // We update updated_at to ensure the profile record is touched
  await MyGlobal.prisma.todo_app_profiles.update({
    where: { user_id: props.user.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
