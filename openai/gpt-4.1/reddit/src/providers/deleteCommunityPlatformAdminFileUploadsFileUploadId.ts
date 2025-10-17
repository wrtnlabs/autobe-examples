import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminFileUploadsFileUploadId(props: {
  admin: AdminPayload;
  fileUploadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { fileUploadId } = props;

  // 1. Ensure file exists (404 if not)
  await MyGlobal.prisma.community_platform_file_uploads.findUniqueOrThrow({
    where: { id: fileUploadId },
  });

  // 2. Prevent deletion if file is referenced as active banner
  const activeBanner =
    await MyGlobal.prisma.community_platform_community_banners.findFirst({
      where: {
        file_upload_id: fileUploadId,
        deleted_at: null,
        active: true,
      },
    });
  if (activeBanner) {
    throw new HttpException(
      "Cannot delete file: still referenced by an active community banner.",
      409,
    );
  }

  // 3. Prevent deletion if file is referenced as active community image
  const activeCommunityImage =
    await MyGlobal.prisma.community_platform_community_images.findFirst({
      where: {
        file_upload_id: fileUploadId,
        deleted_at: null,
        active: true,
      },
    });
  if (activeCommunityImage) {
    throw new HttpException(
      "Cannot delete file: still referenced by an active community image.",
      409,
    );
  }

  // 4. Soft-delete the file (set deleted_at; all cascade handling by Prisma)
  await MyGlobal.prisma.community_platform_file_uploads.update({
    where: { id: fileUploadId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // void return
}
