import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
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

export async function patchRedditPlatformMemberRedditPlatformModerations(props: {
  member: MemberPayload;
  body: IRedditPlatformModeration.IUpdate;
}): Promise<IRedditPlatformModeration> {
  // Find existing moderation assignment for this user
  const existing = await MyGlobal.prisma.reddit_platform_moderations.findFirst({
    where: {
      user_id: props.member.id,
    },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      role: true,
      created_at: true,
    },
  });
  if (!existing) {
    throw new HttpException("Moderation assignment not found", 404);
  }
  // Only owners can update roles (check existing role)
  if (existing.role !== "OWNER") {
    throw new HttpException("Insufficient permission", 403);
  }
  // Update role
  const updated = await MyGlobal.prisma.reddit_platform_moderations.update({
    where: { id: existing.id },
    data: {
      role: typia.assert<"OWNER" | "MODERATOR">(props.body.role),
    },
    select: {
      id: true,
      community_id: true,
      user_id: true,
      role: true,
      created_at: true,
    },
  });
  // Transform to response DTO
  return {
    id: updated.id,
    community_id: updated.community_id,
    user_id: updated.user_id,
    role: typia.assert<"OWNER" | "MODERATOR">(updated.role),
    created_at: toISOStringSafe(updated.created_at),
    community: null as any,
    user: null as any,
  };
}
