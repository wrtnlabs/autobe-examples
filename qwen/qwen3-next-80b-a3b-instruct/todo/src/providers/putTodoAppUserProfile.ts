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
import { TodoAppProfileTransformer } from "../transformers/TodoAppProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserProfile(props: {
  user: UserPayload;
  body: ITodoAppProfile.IUpdate;
}): Promise<ITodoAppProfile> {
  // Validate display_name length and forbidden characters
  if (
    props.body.display_name.length < 1 ||
    props.body.display_name.length > 100
  ) {
    throw new HttpException("PROFILE_DISPLAY_NAME_INVALID", 400);
  }
  if (/[^0-9a-zA-Z\s\u00C0-\u017F]/.test(props.body.display_name)) {
    throw new HttpException("PROFILE_DISPLAY_NAME_INVALID", 400);
  }
  // Verify user owns the profile
  const profile = await MyGlobal.prisma.todo_app_profiles.findUniqueOrThrow({
    where: {
      id: props.user.id,
    },
    ...TodoAppProfileTransformer.select(),
  });
  const updated = await MyGlobal.prisma.todo_app_profiles.update({
    where: {
      id: props.user.id,
    },
    data: {
      display_name: props.body.display_name,
      updated_at: new Date().toISOString(),
    },
  });
  return TodoAppProfileTransformer.transform(updated);
}
