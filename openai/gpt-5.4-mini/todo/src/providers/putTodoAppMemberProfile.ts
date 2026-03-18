import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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
  const profile = await MyGlobal.prisma.todo_app_user_profiles.findFirstOrThrow(
    {
      where: {
        todo_app_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  const updated = await MyGlobal.prisma.todo_app_user_profiles.update({
    where: {
      id: profile.id,
    },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      updated_at: new Date(),
    },
    select: {
      id: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      member: {
        select: {
          id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  return await TodoAppUserProfileTransformer.transform(updated);
}
