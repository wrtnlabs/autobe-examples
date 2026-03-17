import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityImageTransformer } from "../transformers/CommunityPlatformCommunityImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunityIdImagesImageId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IUpdate;
}): Promise<ICommunityPlatformCommunityImage> {
  // 1. Verify community exists and member has permission
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        id: props.communityId,
        OR: [
          { owner_member_id: props.member.id },
          {
            moderationRoles: {
              some: {
                member: { id: props.member.id },
                role_type: { in: ["owner", "moderator"] },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
  // 2. Find the image and verify it belongs to the community
  const image =
    await MyGlobal.prisma.community_platform_community_images.findUniqueOrThrow(
      {
        where: {
          id: props.imageId,
          community_id: props.communityId,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
  // 3. Prepare update data
  const updateData: any = {};
  if (props.body.ordering !== undefined) {
    updateData.ordering = props.body.ordering;
  }
  if (props.body.active !== undefined) {
    updateData.active = props.body.active;
  }
  updateData.updated_at = new Date();
  // 4. If activating, deactivate others
  if (props.body.active === true) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_platform_community_images.updateMany({
        where: {
          community_id: props.communityId,
          id: { not: props.imageId },
          deleted_at: null,
        },
        data: { active: false, updated_at: new Date() },
      });
      await tx.community_platform_community_images.update({
        where: { id: props.imageId },
        data: updateData,
      });
    });
  } else {
    await MyGlobal.prisma.community_platform_community_images.update({
      where: { id: props.imageId },
      data: updateData,
    });
  }
  // 5. Fetch updated image with transformer
  const updated =
    await MyGlobal.prisma.community_platform_community_images.findUniqueOrThrow(
      {
        where: { id: props.imageId },
        ...CommunityPlatformCommunityImageTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityImageTransformer.transform(updated);
}
