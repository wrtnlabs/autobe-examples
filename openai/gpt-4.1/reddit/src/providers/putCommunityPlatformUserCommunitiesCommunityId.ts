import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // 1. Find community, must not be deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
    });
  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Check permission: creator OR moderator
  if (community.creator_user_id !== props.user.id) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_user_id: props.user.id,
          community_platform_community_id: props.communityId,
        },
      });
    if (!moderator) {
      throw new HttpException(
        "Forbidden: Only creator or community moderator can edit community",
        403,
      );
    }
  }

  // 3. Check for unique name (case-insensitive, exclude self)
  const nameLc = props.body.name.toLowerCase();
  const dupe = await MyGlobal.prisma.community_platform_communities.findFirst({
    where: {
      name: nameLc,
      id: {
        not: props.communityId,
      },
      deleted_at: null,
    },
  });
  if (dupe) {
    throw new HttpException("Community name already exists", 409);
  }

  // 4. Write edit history
  await MyGlobal.prisma.community_platform_community_edit_histories.create({
    data: {
      id: v4(),
      community_platform_community_id: props.communityId,
      editor_user_id: props.user.id,
      name: community.name,
      description: community.description,
      edited_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Update community name, description, updated_at
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: {
      name: nameLc,
      description: props.body.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    creator_user_id: updated.creator_user_id,
    name: updated.name,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
