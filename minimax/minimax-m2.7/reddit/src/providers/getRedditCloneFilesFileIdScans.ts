import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileScanTransformer } from "../transformers/RedditCloneFileScanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneFilesFileIdScans(props: {
  fileId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditCloneFileScan> {
  // Verify file exists and is not deleted (soft delete check)
  const file = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.fileId, deleted_at: null },
    select: {
      id: true,
      created_at: true,
      file_size: true,
      mime_type: true,
      original_filename: true,
      status: true,
      uploader: {
        select: {
          id: true,
          username: true,
        },
      },
      thumbnails: {
        select: {
          id: true,
          width: true,
          height: true,
          variant: true,
          thumbnail_path: true,
          created_at: true,
        },
      },
    },
  });
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Fetch scans ordered by scanned_at DESC (most recent first)
  const records = await MyGlobal.prisma.reddit_clone_file_scans.findMany({
    where: { reddit_clone_file_id: props.fileId },
    orderBy: { scanned_at: "desc" },
    skip,
    take: limit,
    ...RedditCloneFileScanTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_file_scans.count({
    where: { reddit_clone_file_id: props.fileId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneFileScanTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneFilesFileIdScans(props: {
//   fileId: string & tags.Format<"uuid">;
// }): Promise<IPageIRedditCloneFileScan> {
//   const records = await MyGlobal.prisma.reddit_clone_file_scans.findMany({
//     ...RedditCloneFileScanTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneFileScanTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------