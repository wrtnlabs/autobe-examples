import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function getMultiUserTodoMemberAccount(props: {
  member: MemberPayload;
}): Promise<IMultiUserTodoUserProfile> {
  const profile = await MyGlobal.prisma.multi_user_todo_user_profiles.findFirst(
    {
      where: {
        multi_user_todo_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        multi_user_todo_member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
      take: 1,
    },
  );
  if (profile === null) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: profile.id,
    displayName: profile.display_name,
    memberId: profile.multi_user_todo_member_id,
    createdAt: toISOStringSafe(profile.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(profile.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      profile.deleted_at === null
        ? null
        : (toISOStringSafe(profile.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
