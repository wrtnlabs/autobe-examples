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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberProfile(props: {
  member: MemberPayload;
}): Promise<ITodoAppProfile> {
  // Find the member record using session_id to get the user ID
  const member = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      id: props.member.id,
      sessions: {
        some: {
          id: props.member.session_id,
        },
      },
      deleted_at: null,
    },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  // Find the profile for this user
  const profile = await MyGlobal.prisma.todo_app_profiles.findUniqueOrThrow({
    where: {
      todo_app_user_id: member.id,
    },
    select: {
      id: true,
      display_name: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Return properly typed profile
  return {
    id: profile.id,
    display_name: profile.display_name,
    created_at: toISOStringSafe(profile.created_at),
    updated_at: toISOStringSafe(profile.updated_at),
  };
}
