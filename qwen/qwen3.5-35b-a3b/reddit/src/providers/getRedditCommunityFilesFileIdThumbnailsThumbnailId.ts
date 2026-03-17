import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityFileThumbnailTransformer } from "../transformers/RedditCommunityFileThumbnailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityFilesFileIdThumbnailsThumbnailId(props: {
  fileId: string & tags.Format<"uuid">;
  thumbnailId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityFileThumbnail> {
  const thumbnail =
    await MyGlobal.prisma.reddit_community_file_thumbnails.findUniqueOrThrow({
      where: {
        id: props.thumbnailId,
        reddit_community_file_id: props.fileId,
      },
      ...RedditCommunityFileThumbnailTransformer.select(),
    });
  if (thumbnail.deleted_at !== null) {
    throw new HttpException("Thumbnail has been deleted", 404);
  }
  if (thumbnail.file.deleted_at !== null) {
    throw new HttpException("Parent file has been deleted", 404);
  }
  return await RedditCommunityFileThumbnailTransformer.transform(thumbnail);
}
