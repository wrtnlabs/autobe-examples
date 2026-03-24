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
  const displayName = props.body.display_name;
  if (displayName.trim().length === 0) {
    throw new HttpException("display_name must be non-empty", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const profile = await tx.todo_app_user_profiles.findFirstOrThrow({
      where: {
        todo_app_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    return await tx.todo_app_user_profiles.update({
      where: { id: profile.id },
      data: {
        display_name: displayName,
      },
      ...TodoAppUserProfileTransformer.select(),
    });
  });
  return await TodoAppUserProfileTransformer.transform(updated);
}
