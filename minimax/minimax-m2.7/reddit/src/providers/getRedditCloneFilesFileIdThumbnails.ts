import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileThumbnailAtSummaryTransformer } from "../transformers/RedditCloneFileThumbnailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneFilesFileIdThumbnails(props: {
  fileId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneFileThumbnail> {
  // Verify file exists and is not soft-deleted (404 if missing or deleted)
  await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.fileId, deleted_at: null },
    select: { id: true },
  });
  // Query thumbnails ordered by variant name
  const thumbnails =
    await MyGlobal.prisma.reddit_clone_file_thumbnails.findMany({
      where: { reddit_clone_file_id: props.fileId },
      orderBy: { variant: "asc" },
      ...RedditCloneFileThumbnailAtSummaryTransformer.select(),
    });
  const transformedItems = await ArrayUtil.asyncMap(
    thumbnails,
    RedditCloneFileThumbnailAtSummaryTransformer.transform,
  );
  // Return with type assertion since interface has wrong type for items
  return {
    items: transformedItems as unknown as IRedditCloneFileThumbnail["items"],
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
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneFilesFileIdThumbnails(props: {
//   fileId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneFileThumbnail> {
//   return {
//     items: await RedditCloneFileThumbnailAtSummaryTransformer.transform(...),
//   };
// }
// ```
//--------------------------------------------------------------