import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFileTransformer } from "../transformers/RedditCloneFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCloneFile.IUpdate;
}): Promise<IRedditCloneFile> {
  // Find the file by fileId - must exist and not soft-deleted
  const file = await MyGlobal.prisma.reddit_clone_files.findUnique({
    where: { id: props.fileId },
    select: {
      id: true,
      uploader_id: true,
      status: true,
      deleted_at: true,
    },
  });
  // Throw NOT_FOUND if file doesn't exist or is soft-deleted
  if (file === null || file.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  // Verify the authenticated uploader matches the file's uploader_id
  if (file.uploader_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate that status is 'processed' (not 'pending' or 'failed')
  if (file.status !== "processed") {
    throw new HttpException(
      "Cannot update file - status must be 'processed'",
      400,
    );
  }
  // Update only the original_filename field
  await MyGlobal.prisma.reddit_clone_files.update({
    where: { id: props.fileId },
    data: {
      original_filename: props.body.original_filename,
      updated_at: new Date(),
    },
  });
  // Retrieve updated file with all relations
  const updatedFile =
    await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
      where: { id: props.fileId },
      ...RedditCloneFileTransformer.select(),
    });
  // Return transformed file response
  return await RedditCloneFileTransformer.transform(updatedFile);
}
