import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdImagesImageId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId, imageId } = props;

  // Step 1: Find the image by imageId and communityId (and not soft-deleted)
  const image =
    await MyGlobal.prisma.community_platform_community_images.findFirst({
      where: {
        id: imageId,
        community_id: communityId,
        deleted_at: null,
      },
    });
  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to specified community",
      404,
    );
  }

  // Step 2: Verify moderator is assigned to this community and is active/not deleted
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderator_assignments.findFirst(
      {
        where: {
          member_id: moderator.id,
          community_id: communityId,
          end_at: null,
        },
      },
    );
  if (!moderatorAssignment) {
    throw new HttpException(
      "Forbidden: only moderators assigned to the community may delete images",
      403,
    );
  }

  // Step 3: Hard delete the image record
  await MyGlobal.prisma.community_platform_community_images.delete({
    where: { id: imageId },
  });
}
