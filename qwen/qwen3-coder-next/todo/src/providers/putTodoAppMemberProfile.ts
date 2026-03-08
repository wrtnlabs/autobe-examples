import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppProfileTransformer } from "../transformers/TodoAppProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: ITodoAppProfile.IUpdate;
}): Promise<ITodoAppProfile> {
  // Validate display_name if provided
  if (props.body.display_name !== undefined) {
    const name = props.body.display_name;
    if (name.trim().length === 0) {
      throw new HttpException("Display name cannot be whitespace-only", 400);
    }
    if (name.length < 1 || name.length > 100) {
      throw new HttpException(
        "Display name must be between 1 and 100 characters",
        400,
      );
    }
  }
  // Update profile record
  const profile = await MyGlobal.prisma.todo_app_profiles.update({
    where: { todo_app_user_id: props.member.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    ...TodoAppProfileTransformer.select(),
  });
  return await TodoAppProfileTransformer.transform(profile);
}
