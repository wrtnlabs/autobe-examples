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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberProfile(props: {
  member: MemberPayload;
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
  return {
    id: profile.id,
    todoAppMember: {
      id: profile.member.id,
      email: profile.member.email,
      created_at: profile.member.created_at.toISOString(),
      updated_at: profile.member.updated_at.toISOString(),
      deleted_at: profile.member.deleted_at?.toISOString() ?? null,
    },
    displayName: profile.display_name,
    createdAt: profile.created_at.toISOString(),
    updatedAt: profile.updated_at.toISOString(),
    deletedAt: profile.deleted_at?.toISOString() ?? null,
  };
}
