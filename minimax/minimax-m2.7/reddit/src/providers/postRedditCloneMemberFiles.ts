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
import { RedditCloneFileCollector } from "../collectors/RedditCloneFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneFileTransformer } from "../transformers/RedditCloneFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberFiles(props: {
  member: MemberPayload;
  body: IRedditCloneFile.ICreate;
}): Promise<IRedditCloneFile> {
  // Validate MIME type
  const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!ALLOWED_MIME_TYPES.includes(props.body.mime_type)) {
    throw new HttpException(
      `Invalid mime type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
      400,
    );
  }
  // Decode base64 file_data and validate file size
  const fileBuffer = Buffer.from(props.body.file_data, "base64");
  const fileSize = fileBuffer.length;
  const MIN_FILE_SIZE = 1024; // 1KB
  const MAX_FILE_SIZE = 5242880; // 5MB
  if (fileSize < MIN_FILE_SIZE || fileSize > MAX_FILE_SIZE) {
    throw new HttpException(
      `File size must be between 1KB and 5MB. Received: ${fileSize} bytes`,
      400,
    );
  }
  // Validate target_type
  const ALLOWED_TARGET_TYPES = ["user", "community", "post"];
  if (!ALLOWED_TARGET_TYPES.includes(props.body.target_type)) {
    throw new HttpException(
      `Invalid target_type. Allowed: ${ALLOWED_TARGET_TYPES.join(", ")}`,
      400,
    );
  }
  // Validate target_id exists in corresponding table
  switch (props.body.target_type) {
    case "user": {
      await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
        where: { id: props.body.target_id },
      });
      break;
    }
    case "community": {
      await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
        where: { id: props.body.target_id },
      });
      break;
    }
    case "post": {
      await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
        where: { id: props.body.target_id },
      });
      break;
    }
  }
  // Create member entity for collector
  const memberEntity: IEntity = {
    id: props.member.id,
  };
  // Use collector to generate file data
  const fileData = await RedditCloneFileCollector.collect({
    body: props.body,
    redditCloneMembers: memberEntity,
  });
  // Create file record
  const createdFile = await MyGlobal.prisma.reddit_clone_files.create({
    data: {
      id: fileData.id,
      original_filename: fileData.original_filename,
      stored_filename: fileData.stored_filename,
      mime_type: fileData.mime_type,
      file_size: fileData.file_size,
      storage_path: fileData.storage_path,
      status: "pending",
      created_at: fileData.created_at,
      updated_at: fileData.updated_at,
      deleted_at: null,
      uploader: fileData.uploader,
    },
  });
  // Create file association
  await MyGlobal.prisma.reddit_clone_file_associations.create({
    data: {
      id: v4(),
      reddit_clone_file_id: createdFile.id,
      target_id: props.body.target_id,
      target_type: props.body.target_type,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Fetch complete file with all relations using transformer
  const fileWithRelations =
    await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
      where: { id: createdFile.id },
      ...RedditCloneFileTransformer.select(),
    });
  return await RedditCloneFileTransformer.transform(fileWithRelations);
}
