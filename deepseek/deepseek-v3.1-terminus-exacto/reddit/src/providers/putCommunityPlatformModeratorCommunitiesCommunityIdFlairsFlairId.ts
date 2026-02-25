import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityFlairTransformer } from "../transformers/CommunityPlatformCommunityFlairTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdFlairsFlairId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  flairId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityFlair.IUpdate;
}): Promise<ICommunityPlatformCommunityFlair> {
  // 1. Verify community exists and moderator is the owner
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_user_id: true,
      },
    });
  // According to analysis files: only community owner can edit community info (moderators cannot)
  if (community.owner_user_id !== props.moderator.id) {
    throw new HttpException(
      "Only the community owner can edit flair definitions",
      403,
    );
  }
  // 2. Verify flair exists and belongs to this community
  await MyGlobal.prisma.community_platform_community_flairs.findUniqueOrThrow({
    where: {
      id: props.flairId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
  });
  // 3. Check display_text uniqueness if being updated
  if (props.body.display_text !== undefined) {
    const duplicateFlair =
      await MyGlobal.prisma.community_platform_community_flairs.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          display_text: props.body.display_text,
          deleted_at: null,
          NOT: {
            id: props.flairId,
          },
        },
      });
    if (duplicateFlair) {
      throw new HttpException(
        "A flair with this display text already exists in this community",
        409,
      );
    }
  }
  // 4. Prepare update data with proper null handling
  const updateData: Prisma.community_platform_community_flairsUpdateInput = {};
  if (props.body.display_text !== undefined) {
    updateData.display_text = props.body.display_text;
  }
  if (props.body.background_color !== undefined) {
    updateData.background_color = props.body.background_color;
  }
  if (props.body.text_color !== undefined) {
    updateData.text_color = props.body.text_color;
  }
  if (props.body.css_class !== undefined) {
    updateData.css_class = props.body.css_class;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Set updated_at without using Date type - use current ISO timestamp
  const currentTimestamp = toISOStringSafe(new Date());
  updateData.updated_at = new Date(currentTimestamp); // Prisma expects Date object
  // 5. Perform the update
  await MyGlobal.prisma.community_platform_community_flairs.update({
    where: {
      id: props.flairId,
    },
    data: updateData,
  });
  // 6. Fetch and return the updated flair using transformer
  const updatedFlair =
    await MyGlobal.prisma.community_platform_community_flairs.findUniqueOrThrow(
      {
        where: {
          id: props.flairId,
        },
        ...CommunityPlatformCommunityFlairTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityFlairTransformer.transform(
    updatedFlair,
  );
}
