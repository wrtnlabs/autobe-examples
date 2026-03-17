import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppUserProfileTransformer } from "../transformers/TodoAppUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: ITodoAppUserProfile.IUpdate;
}): Promise<ITodoAppUserProfile> {
  // Step 1: Resolve the profile for the authenticated member (404 if missing)
  const profile =
    await MyGlobal.prisma.todo_app_user_profiles.findUniqueOrThrow({
      where: { todo_app_member_id: props.member.id },
      select: { id: true },
    });
  // Step 2: Update display_name and updated_at
  await MyGlobal.prisma.todo_app_user_profiles.update({
    where: { id: profile.id },
    data: {
      display_name: props.body.displayName,
      updated_at: new Date(),
    },
  });
  // Step 3: Fetch the updated record using the transformer's select
  const updated =
    await MyGlobal.prisma.todo_app_user_profiles.findUniqueOrThrow({
      where: { id: profile.id },
      ...TodoAppUserProfileTransformer.select(),
    });
  // Step 4: Transform and return
  return TodoAppUserProfileTransformer.transform(updated);
}
