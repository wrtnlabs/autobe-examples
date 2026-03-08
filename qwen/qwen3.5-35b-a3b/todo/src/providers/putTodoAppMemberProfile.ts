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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: ITodoAppUserProfile.IUpdate;
}): Promise<ITodoAppUserProfile> {
  const displayName = props.body.display_name;
  if (displayName === undefined || displayName.trim().length === 0) {
    throw new HttpException("display_name must be a non-empty string", 400);
  }
  if (displayName.length > 50) {
    throw new HttpException("display_name must be 50 characters or less", 400);
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(displayName)) {
    throw new HttpException(
      "display_name must contain only alphanumeric characters, spaces, underscores, or hyphens",
      400,
    );
  }
  const profile = await MyGlobal.prisma.todo_app_user_profiles.findFirst({
    where: {
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      display_name: true,
      last_display_name_change_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (profile === null) {
    throw new HttpException("Profile not found", 404);
  }
  if (profile.last_display_name_change_at !== null) {
    const lastChange = profile.last_display_name_change_at;
    const currentTime = new Date().toISOString();
    const lastChangeDate = new Date(lastChange);
    const currentDate = new Date(currentTime);
    const hoursDiff =
      (currentDate.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      throw new HttpException(
        "Display name can only be changed once every 24 hours",
        400,
      );
    }
  }
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const updated = await MyGlobal.prisma.todo_app_user_profiles.update({
    where: {
      id: profile.id,
    },
    data: {
      display_name: displayName,
      last_display_name_change_at: now,
    },
    select: {
      id: true,
      display_name: true,
      last_display_name_change_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: updated.id,
    display_name: updated.display_name,
    lastDisplayNameChange:
      updated.last_display_name_change_at?.toISOString() ?? null,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
  } satisfies ITodoAppUserProfile;
}
