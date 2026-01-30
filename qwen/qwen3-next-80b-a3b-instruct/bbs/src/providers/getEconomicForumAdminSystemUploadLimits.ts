import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIEconomicForumUploadLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumUploadLimit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicForumUploadLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUploadLimit";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicForumAdminSystemUploadLimits(props: {
  admin: AdminPayload;
}): Promise<IPageIEconomicForumUploadLimit> {
  const uploadLimit =
    await MyGlobal.prisma.economic_forum_upload_limits.findUnique({
      where: {
        id: "1",
      },
      select: {
        max_file_size: true,
        allowed_file_types: true,
        max_files_per_post: true,
      },
    });
  if (!uploadLimit) {
    throw new HttpException("No upload limits configuration exists", 404);
  }
  return {
    data: [
      {
        maxFileSizeBytes: uploadLimit.max_file_size,
        allowedFileTypes: uploadLimit.allowed_file_types
          .split(",")
          .filter(
            (type) => type.trim().length > 0,
          ) satisfies string[] as string[],
        maxFilesPerUpload: uploadLimit.max_files_per_post,
      },
    ],
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
