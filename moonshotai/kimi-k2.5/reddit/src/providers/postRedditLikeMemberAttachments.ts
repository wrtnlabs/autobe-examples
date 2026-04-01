import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentCollector } from "../collectors/RedditLikeAttachmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeAttachmentTransformer } from "../transformers/RedditLikeAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberAttachments(props: {
  member: MemberPayload;
  body: IRedditLikeAttachment.ICreate;
}): Promise<IRedditLikeAttachment> {
  // Generate mock file metadata since infrastructure service is not available
  // In production, this would be handled by MyGlobal.infrastructure.file.process()
  const fileExtension = props.body.fileUri.split(".").pop() || "bin";
  const mimeTypeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    pdf: "application/pdf",
  };
  const fileData: RedditLikeAttachmentCollector.IFileProcessedData = {
    storagePath: `/storage/attachments/${v4()}.${fileExtension}`,
    mimeType:
      mimeTypeMap[fileExtension.toLowerCase()] || "application/octet-stream",
    fileSizeBytes: 0,
    checksumSha256: "pending-infrastructure-processing",
  };
  const attachment = await MyGlobal.prisma.reddit_like_attachments.create({
    data: await RedditLikeAttachmentCollector.collect({
      body: props.body,
      redditLikeMembers: { id: props.member.id },
      fileData,
    }),
    ...RedditLikeAttachmentTransformer.select(),
  });
  return await RedditLikeAttachmentTransformer.transform(attachment);
}
