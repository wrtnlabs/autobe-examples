import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunitiesCommunityIdImages(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.ICreate;
}): Promise<ICommunityPlatformCommunityImage> {
  // Verify that the target community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Verify that the file_upload_id exists in global uploads
  const fileUpload =
    await MyGlobal.prisma.community_platform_file_uploads.findFirst({
      where: { id: props.body.file_upload_id, deleted_at: null },
    });
  if (!fileUpload) {
    throw new HttpException("File upload not found", 404);
  }

  const imageId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_images.create({
      data: {
        id: imageId,
        community_id: props.communityId,
        file_upload_id: props.body.file_upload_id,
        image_type: props.body.image_type,
        order: props.body.order ?? null,
        alt_text: props.body.alt_text ?? null,
        active: props.body.active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    community_id: created.community_id,
    file_upload_id: created.file_upload_id,
    image_type: created.image_type,
    order: created.order ?? null,
    alt_text: created.alt_text ?? null,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
