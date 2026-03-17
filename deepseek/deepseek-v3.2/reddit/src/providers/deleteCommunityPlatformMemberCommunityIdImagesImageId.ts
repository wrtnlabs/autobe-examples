import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformMemberCommunityIdImagesImageId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify member has moderation role in community
  const role =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
        role_type: {
          in: ["owner", "moderator"],
        },
      },
      select: { id: true },
    });
  if (!role) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Fetch image with community verification
  const image =
    await MyGlobal.prisma.community_platform_community_images.findFirst({
      where: {
        id: props.imageId,
        community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true, active: true },
    });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  // 3. Soft delete
  await MyGlobal.prisma.community_platform_community_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 4. If deleted image was active, set another as active
  if (image.active) {
    const nextImage =
      await MyGlobal.prisma.community_platform_community_images.findFirst({
        where: {
          community_id: props.communityId,
          deleted_at: null,
          id: { not: props.imageId },
        },
        select: { id: true },
        orderBy: { ordering: "desc" },
      });
    if (nextImage) {
      await MyGlobal.prisma.community_platform_community_images.update({
        where: { id: nextImage.id },
        data: { active: true, updated_at: new Date() },
      });
    }
  }
}
