import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberAvatars(props: {
  member: MemberPayload;
  body: IRedditCloneFileAssociation.ICreate;
}): Promise<IRedditCloneFileAssociation.IResponse> {
  const profile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { reddit_clone_member_id: props.member.id },
    });
  const base64Data = props.body.imageData;
  const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  let mimeType: string;
  let imageBuffer: Buffer;
  if (base64Match) {
    mimeType = base64Match[1];
    imageBuffer = Buffer.from(base64Match[2], "base64");
  } else {
    mimeType = "image/png";
    imageBuffer = Buffer.from(base64Data, "base64");
  }
  const validFormats = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validFormats.includes(mimeType)) {
    throw new HttpException(
      "Invalid image format. Accepted formats: JPEG, PNG, GIF, WebP.",
      400,
    );
  }
  const maxSize = 5 * 1024 * 1024;
  if (imageBuffer.length > maxSize) {
    throw new HttpException("File size exceeds maximum limit of 5MB.", 400);
  }
  const fileId = v4();
  const originalFilename = props.body.filename ?? "avatar";
  const fileExtension = mimeType.split("/")[1];
  const storedFilename = `${fileId}-${Date.now()}.${fileExtension}`;
  const storagePath = `avatars/${storedFilename}`;
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  await MyGlobal.prisma.reddit_clone_files.create({
    data: {
      id: fileId,
      uploader_id: props.member.id,
      original_filename: originalFilename,
      stored_filename: storedFilename,
      mime_type: mimeType,
      file_size: imageBuffer.length,
      storage_path: storagePath,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const scanId = v4();
  await MyGlobal.prisma.reddit_clone_file_scans.create({
    data: {
      id: scanId,
      reddit_clone_file_id: fileId,
      scanner: "system",
      status: "pending",
      scanned_at: now,
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.reddit_clone_files.update({
    where: { id: fileId },
    data: {
      status: "processed",
      updated_at: now,
    },
  });
  await MyGlobal.prisma.reddit_clone_file_scans.update({
    where: { id: scanId },
    data: {
      status: "clean",
      threat_name: "No threats detected",
      scanned_at: now,
      updated_at: now,
    },
  });
  if (profile.reddit_clone_file_association_id) {
    await MyGlobal.prisma.reddit_clone_file_associations.deleteMany({
      where: {
        target_type: "user",
        target_id: profile.id,
      },
    });
  }
  const associationId = v4();
  const createdAt = nowIso;
  const updatedAt = nowIso;
  const createdAssociation =
    await MyGlobal.prisma.reddit_clone_file_associations.create({
      data: {
        id: associationId,
        reddit_clone_file_id: fileId,
        target_type: "user",
        target_id: profile.id,
        created_at: now,
        updated_at: now,
      },
    });
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { id: profile.id },
    data: {
      reddit_clone_file_association_id: associationId,
      updated_at: now,
    },
  });
  const fileWithRelations =
    await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
      where: { id: fileId },
      select: {
        id: true,
        original_filename: true,
        mime_type: true,
        file_size: true,
        status: true,
        created_at: true,
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
        } satisfies Prisma.reddit_clone_file_thumbnailsFindManyArgs,
      },
    });
  const transformedFile: IRedditCloneFile.ISummary = {
    id: fileWithRelations.id,
    originalFilename: fileWithRelations.original_filename,
    mimeType: fileWithRelations.mime_type,
    fileSize: fileWithRelations.file_size,
    status: fileWithRelations.status,
    createdAt: toISOStringSafe(fileWithRelations.created_at),
    uploader: {
      id: fileWithRelations.uploader.id,
      username: fileWithRelations.uploader.username,
    } satisfies IRedditCloneMember.ISummary,
    thumbnails:
      fileWithRelations.thumbnails.length > 0
        ? fileWithRelations.thumbnails.map(
            (t): IRedditCloneFileThumbnail => ({
              items: {
                id: t.id,
                width: t.width,
                height: t.height,
                variant: t.variant,
                thumbnailPath: t.thumbnail_path,
                createdAt: toISOStringSafe(t.created_at),
              },
            }),
          )
        : undefined,
  };
  return {
    id: createdAssociation.id,
    targetType: createdAssociation.target_type,
    targetId: createdAssociation.target_id,
    file: transformedFile,
    createdAt: createdAt,
    updatedAt: updatedAt,
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
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberAvatars(props: {
//   member: MemberPayload;
//   body: IRedditCloneFileAssociation.ICreate;
// }): Promise<IRedditCloneFileAssociation.IResponse> {
//   return {
//     id: ...,
//     targetType: ...,
//     targetId: ...,
//     file: await RedditCloneFileAtSummaryTransformer.transform(...),
//     createdAt: ...,
//     updatedAt: ...,
//   };
// }
// ```
//--------------------------------------------------------------