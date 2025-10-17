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

export async function postCommunityPlatformModeratorCommunitiesCommunityIdImages(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityImage.ICreate;
}): Promise<ICommunityPlatformCommunityImage> {
  // 1. Validate moderator's assignment to this community
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: props.communityId,
        status: "active",
        deleted_at: null,
      },
    });
  if (!moderatorRecord) {
    throw new HttpException(
      "Permission denied: You are not an active moderator of this community.",
      403,
    );
  }
  // 2. Validate referenced file_upload_id exists and is an active image
  const fileRecord =
    await MyGlobal.prisma.community_platform_file_uploads.findFirst({
      where: {
        id: props.body.file_upload_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!fileRecord) {
    throw new HttpException(
      "Invalid or inactive file reference for this image.",
      400,
    );
  }
  // Check allowed file types
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!(allowedMimeTypes.indexOf(fileRecord.mime_type) !== -1)) {
    throw new HttpException(
      "File type is not allowed. Only PNG and JPEG images are permitted.",
      400,
    );
  }
  // File size limit: try to read from config, fallback to 20MB
  let maxFileSize = 20 * 1024 * 1024;
  const config =
    await MyGlobal.prisma.community_platform_system_configs.findFirst({
      where: { key: "maxCommunityImageFileSizeBytes" },
    });
  if (config) {
    const parsedValue = Number(config.value);
    if (!Number.isNaN(parsedValue)) {
      maxFileSize = parsedValue;
    }
  }
  if (fileRecord.file_size_bytes > maxFileSize) {
    throw new HttpException(
      `File size exceeds the maximum allowed size of ${maxFileSize} bytes.`,
      400,
    );
  }
  // 3. Image quota: only allow one active image per type per community (example business rule)
  const count = await MyGlobal.prisma.community_platform_community_images.count(
    {
      where: {
        community_id: props.communityId,
        image_type: props.body.image_type,
        deleted_at: null,
        active: true,
      },
    },
  );
  let maxPerType = 1;
  const quotaConfig =
    await MyGlobal.prisma.community_platform_system_configs.findFirst({
      where: { key: "maxCommunityImagesPerType" },
    });
  if (quotaConfig) {
    const parsedQuota = Number(quotaConfig.value);
    if (!Number.isNaN(parsedQuota) && parsedQuota > 0) {
      maxPerType = parsedQuota;
    }
  }
  if (count >= maxPerType) {
    throw new HttpException(
      `Quota exceeded: Only ${maxPerType} active image(s) of type '${props.body.image_type}' allowed per community.`,
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_images.create({
      data: {
        id: v4(),
        community_id: props.communityId,
        file_upload_id: props.body.file_upload_id,
        image_type: props.body.image_type,
        order: typeof props.body.order === "number" ? props.body.order : null,
        alt_text:
          typeof props.body.alt_text === "string" ? props.body.alt_text : null,
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
    order: created.order,
    alt_text: created.alt_text,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
