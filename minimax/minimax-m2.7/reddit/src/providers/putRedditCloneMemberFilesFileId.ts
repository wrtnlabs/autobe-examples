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
  // 1. Fetch and verify file exists, not soft-deleted
  const file = await MyGlobal.prisma.reddit_clone_files.findUnique({
    where: { id: props.fileId },
    select: {
      id: true,
      uploader_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (!file || file.deleted_at !== null) {
    throw new HttpException("File not found", 404);
  }
  // 2. Verify uploader matches authenticated member
  if (file.uploader_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Reject if target_type is 'post' (post images cannot be modified)
  if (props.body.targetType === "post") {
    throw new HttpException(
      "Post images cannot be modified after creation",
      403,
    );
  }
  // 4. Update target association if target parameters provided
  if (
    props.body.targetId !== undefined &&
    props.body.targetType !== undefined
  ) {
    // Delete existing association
    await MyGlobal.prisma.reddit_clone_file_associations.deleteMany({
      where: { reddit_clone_file_id: props.fileId },
    });
    // Create new association
    await MyGlobal.prisma.reddit_clone_file_associations.create({
      data: {
        id: v4(),
        reddit_clone_file_id: props.fileId,
        target_type: props.body.targetType,
        target_id: props.body.targetId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // 5. Update file status and timestamp
  const updateData: {
    updated_at: Date;
    status?: string;
  } = {
    updated_at: new Date(),
  };
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  await MyGlobal.prisma.reddit_clone_files.update({
    where: { id: props.fileId },
    data: updateData,
  });
  // 6. Return updated file using transformer
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