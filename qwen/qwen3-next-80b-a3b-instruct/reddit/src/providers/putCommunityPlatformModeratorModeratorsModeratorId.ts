import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";

export async function putCommunityPlatformModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string;
  body: ICommunityPlatformModerator.IUpdate;
}): Promise<ICommunityPlatformModerator> {
  // Validate moderator exists and is active
  const existing =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.moderatorId,
        deleted_at: null,
        member_id: props.moderator.id,
      },
    });
  if (!existing) {
    throw new HttpException("Moderator not found or unauthorized", 404);
  }
  // Prepare update data
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Handle status update
  if (props.body.status === "active") {
    updateData.is_active = true;
  } else if (props.body.status === "suspended") {
    updateData.is_active = false;
  }
  // Handle permissions update
  if (props.body.permissions) {
    let flag = 0;
    if (props.body.permissions.can_delete_posts) flag |= 1;
    if (props.body.permissions.can_delete_comments) flag |= 2;
    if (props.body.permissions.can_ban_users) flag |= 4;
    // can_manage_moderators is not modifiable
    updateData.permission_flag = flag;
  }
  // Update the moderator record
  const updated = await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: props.moderatorId },
    data: updateData,
  });
  // Log moderation action
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      action_type: "MODERATOR_UPDATED",
      moderator_id: props.moderator.id,
      target_id: props.moderatorId,
      performedAt: toISOStringSafe(new Date()),
      details: JSON.stringify({
        status: props.body.status,
        permissions: props.body.permissions,
      }),
    },
  });
  // Return updated record using transformer
  return CommunityPlatformModeratorTransformer.transform(updated);
}
