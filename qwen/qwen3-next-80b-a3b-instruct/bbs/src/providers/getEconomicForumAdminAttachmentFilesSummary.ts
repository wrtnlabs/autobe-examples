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
import { IPageIEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumAttachmentFile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicForumAdminAttachmentFilesSummary(props: {
  admin: AdminPayload;
}): Promise<IPageIEconomicForumAttachmentFile.ISummary> {
  const result =
    await MyGlobal.prisma.economic_forum_attachment_files.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
      _min: {
        created_at: true,
      },
      _max: {
        created_at: true,
      },
    });
  const fileTypes =
    await MyGlobal.prisma.economic_forum_attachment_files.groupBy({
      by: ["mime_type"],
      _count: {
        id: true,
      },
    });
  const fileTypeDistribution: {
    [key: string]: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {};
  for (const type of fileTypes) {
    fileTypeDistribution[type.mime_type] = type._count.id ?? 0;
  }
  // Type conversion for aggregation results to ensure compatibility with tags
  const totalFiles = result._count?.id ?? 0;
  const totalStorageBytes = result._sum?.size ?? 0;
  const averageFileSize = totalFiles > 0 ? totalStorageBytes / totalFiles : 0;
  const oldestUploadAt = result._min?.created_at
    ? toISOStringSafe(result._min.created_at)
    : null;
  const newestUploadAt = result._max?.created_at
    ? toISOStringSafe(result._max.created_at)
    : null;
  // Return exactly the structure defined in IPageIEconomicForumAttachmentFile.ISummary
  return {
    pagination: {
      current: 1,
      limit: 50,
      records: totalFiles as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages:
        totalFiles > 0
          ? 1
          : (0 as number & tags.Type<"int32"> & tags.Minimum<0>),
    } satisfies IPage.IPagination,
    data: {
      total_files: totalFiles as number & tags.Type<"int32"> & tags.Minimum<0>,
      total_storage_bytes: totalStorageBytes as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      average_file_size: averageFileSize,
      oldest_upload_at: oldestUploadAt,
      newest_upload_at: newestUploadAt,
      file_type_distribution: fileTypeDistribution,
    },
  };
}
