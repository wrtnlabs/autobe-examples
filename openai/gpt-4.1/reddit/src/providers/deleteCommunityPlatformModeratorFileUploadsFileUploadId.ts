import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorFileUploadsFileUploadId(props: {
  moderator: ModeratorPayload;
  fileUploadId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Lookup the file record by UUID
  const file = await MyGlobal.prisma.community_platform_file_uploads.findFirst({
    where: { id: props.fileUploadId },
  });

  if (file === null || file.deleted_at !== null) {
    throw new HttpException("File upload not found or already deleted", 404);
  }

  // Prepare timestamp for deleted_at (ISO format)
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.community_platform_file_uploads.update({
    where: { id: props.fileUploadId },
    data: {
      deleted_at: now,
    },
  });
  // No return value
}
