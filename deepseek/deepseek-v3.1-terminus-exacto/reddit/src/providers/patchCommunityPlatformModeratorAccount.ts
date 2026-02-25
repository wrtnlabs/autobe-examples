import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorAccount(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.IUpdate;
}): Promise<ICommunityPlatformModerator> {
  // Verify moderator exists and is active
  const existingModerator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: {
        id: props.moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  // Build partial update data with proper null handling
  const updateData: Prisma.community_platform_moderatorsUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  // Handle each optional field with proper null/undefined handling
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio === null ? null : props.body.bio;
  }
  if (props.body.avatar_url !== undefined) {
    updateData.avatar_url =
      props.body.avatar_url === null ? null : props.body.avatar_url;
  }
  // Perform the update
  const updatedModerator =
    await MyGlobal.prisma.community_platform_moderators.update({
      where: { id: props.moderator.id },
      data: updateData,
      ...CommunityPlatformModeratorTransformer.select(),
    });
  // Transform and return the response
  return await CommunityPlatformModeratorTransformer.transform(
    updatedModerator,
  );
}
