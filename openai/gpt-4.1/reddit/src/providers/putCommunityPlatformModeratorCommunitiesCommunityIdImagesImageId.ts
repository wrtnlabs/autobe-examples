import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityIdImagesImageId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.IUpdate;
}): Promise<ICommunityPlatformCommunityImage> {
  const { moderator, communityId, imageId, body } = props;

  // 1. Fetch the image record and verify it belongs to the targeted community and is not deleted
  const image =
    await MyGlobal.prisma.community_platform_community_images.findUnique({
      where: { id: imageId },
    });
  if (!image || image.community_id !== communityId || image.deleted_at) {
    throw new HttpException("Community image not found", 404);
  }

  // 2. Authorization: The moderator must be assigned to this community and be active
  const mod = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      member_id: moderator.id,
      community_id: communityId,
      status: "active",
      deleted_at: null,
    },
  });
  if (!mod) {
    throw new HttpException(
      "Forbidden: You are not authorized for this community",
      403,
    );
  }

  // 3. Prepare update fields (only modifiable fields)
  const updateData = {
    ...(body.image_type !== undefined && { image_type: body.image_type }),
    ...(body.order !== undefined && { order: body.order }),
    ...(body.alt_text !== undefined && { alt_text: body.alt_text }),
    ...(body.active !== undefined && { active: body.active }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 4. Update image record
  const updated =
    await MyGlobal.prisma.community_platform_community_images.update({
      where: { id: imageId },
      data: updateData,
    });

  // 5. Return object (convert dates, match nullable fields)
  return {
    id: updated.id,
    community_id: updated.community_id,
    file_upload_id: updated.file_upload_id,
    image_type: updated.image_type,
    order: updated.order ?? null,
    alt_text: updated.alt_text ?? null,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
