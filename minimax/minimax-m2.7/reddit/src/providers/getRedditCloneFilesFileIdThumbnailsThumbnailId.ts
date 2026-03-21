import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileThumbnailTransformer } from "../transformers/RedditCloneFileThumbnailTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneFilesFileIdThumbnailsThumbnailId(props: {
  fileId: string & tags.Format<"uuid">;
  thumbnailId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneFileThumbnail> {
  const thumbnail =
    await MyGlobal.prisma.reddit_clone_file_thumbnails.findUniqueOrThrow({
      where: { id: props.thumbnailId },
      ...RedditCloneFileThumbnailTransformer.select(),
    });
  if (thumbnail.file.id !== props.fileId) {
    throw new HttpException("Not Found", 404);
  }
  return await RedditCloneFileThumbnailTransformer.transform(thumbnail);
}
