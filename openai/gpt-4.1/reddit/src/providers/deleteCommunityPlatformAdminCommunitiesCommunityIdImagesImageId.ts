import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdImagesImageId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityId, imageId } = props;

  // First, check image record exists and belongs to the requested community
  const image =
    await MyGlobal.prisma.community_platform_community_images.findFirst({
      where: {
        id: imageId,
        community_id: communityId,
      },
    });
  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to this community",
      404,
    );
  }

  // Hard delete: remove record
  await MyGlobal.prisma.community_platform_community_images.delete({
    where: { id: imageId },
  });
}
