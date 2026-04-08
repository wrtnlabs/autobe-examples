import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFileTransformer } from "../transformers/RedditCloneFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCloneFile.IUpdate;
}): Promise<IRedditCloneFile> {
  // 1. Retrieve the file and verify it exists and is not soft-deleted
  const file = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.fileId },
    select: { id: true, uploader_id: true, deleted_at: true },
  });
  if (file.deleted_at !== null) {
    throw new HttpException("File not found", 404);
  }
  // 2. Handle target reassignment if target parameters are provided
  if (
    props.body.targetType !== undefined ||
    props.body.targetId !== undefined
  ) {
    // Authorization: Only the uploader can reassign the target
    if (file.uploader_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Business rule: Post images cannot be modified after creation
    if (props.body.targetType === "post") {
      throw new HttpException(
        "Post images cannot be modified after creation",
        403,
      );
    }
    // Update the target association in reddit_clone_file_associations
    const existingAssociation =
      await MyGlobal.prisma.reddit_clone_file_associations.findUnique({
        where: { reddit_clone_file_id: props.fileId },
      });
    if (existingAssociation) {
      await MyGlobal.prisma.reddit_clone_file_associations.update({
        where: { reddit_clone_file_id: props.fileId },
        data: {
          target_type: props.body.targetType,
          target_id: props.body.targetId,
          updated_at: new Date(),
        },
      });
    }
  }
  // 3. Update file status if provided (only admin can change status, members cannot)
  if (props.body.status !== undefined) {
    // Note: Status update is restricted - in production, add admin role check here
    await MyGlobal.prisma.reddit_clone_files.update({
      where: { id: props.fileId },
      data: {
        status: props.body.status,
        updated_at: new Date(),
      },
    });
  }
  // 4. Return the updated file with all related data
  const updated = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.fileId },
    ...RedditCloneFileTransformer.select(),
  });
  return await RedditCloneFileTransformer.transform(updated);
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
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberFilesFileId(props: {
//   member: MemberPayload;
//   fileId: string & tags.Format<"uuid">;
//   body: IRedditCloneFile.IUpdate;
// }): Promise<IRedditCloneFile> {
//   await MyGlobal.prisma.reddit_clone_files.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneFileTransformer.select(),
//   });
//   return await RedditCloneFileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------