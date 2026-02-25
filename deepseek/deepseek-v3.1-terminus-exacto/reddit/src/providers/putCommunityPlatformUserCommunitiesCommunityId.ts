import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserCommunitiesCommunityId(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Check if community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { owner_user_id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if user has permission (owner or moderator)
  const isOwner = community.owner_user_id === props.user.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          user_id: props.user.id,
          deleted_at: null,
        },
      });
    if (!moderator) {
      throw new HttpException(
        "You don't have permission to update this community",
        403,
      );
    }
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingCommunity =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.communityId },
          deleted_at: null,
        },
      });
    if (existingCommunity) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  // Partial update with only provided fields
  const updatedCommunity =
    await MyGlobal.prisma.community_platform_communities.update({
      where: { id: props.communityId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.icon_url !== undefined && {
          icon_url: props.body.icon_url,
        }),
        updated_at: new Date(),
      } satisfies Prisma.community_platform_communitiesUpdateInput,
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(
    updatedCommunity,
  );
}
