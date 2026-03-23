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

export async function patchTodoAppMemberProfileProfileId(props: {
  member: MemberPayload;
  profileId: string;
  body: ITodoAppProfile.IUpdate;
}): Promise<ITodoAppProfile> {
  const profile = await MyGlobal.prisma.todo_app_profiles.findUniqueOrThrow({
    where: { id: props.profileId },
    select: { id: true, todo_app_user_id: true },
  });
  if (profile.todo_app_user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.todo_app_profiles.update({
    where: { id: props.profileId },
    data: {
      display_name: props.body.display_name,
      updated_at: new Date(),
    },
    ...TodoAppProfileTransformer.select(),
  });
  return await TodoAppProfileTransformer.transform(updated);
}
