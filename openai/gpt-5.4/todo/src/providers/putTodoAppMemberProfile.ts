import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
  const profile = await MyGlobal.prisma.todo_app_profiles.findFirstOrThrow({
    where: {
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
    ...TodoAppProfileTransformer.select(),
  });
  if (profile.display_name === props.body.displayName) {
    return await TodoAppProfileTransformer.transform(profile);
  }
  await MyGlobal.prisma.todo_app_profiles.update({
    where: {
      id: profile.id,
    },
    data: {
      display_name: props.body.displayName,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.todo_app_profiles.findUniqueOrThrow({
    where: {
      id: profile.id,
    },
    ...TodoAppProfileTransformer.select(),
  });
  return await TodoAppProfileTransformer.transform(updated);
}
