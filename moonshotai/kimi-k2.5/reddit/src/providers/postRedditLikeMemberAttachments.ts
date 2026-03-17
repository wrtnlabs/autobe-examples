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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeAttachmentTransformer } from "../transformers/RedditLikeAttachmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberAttachments(props: {
  member: AdminPayload;
  body: IRedditLikeAttachment.ICreate;
}): Promise<IRedditLikeAttachment> {
  // Infrastructure layer processing - in production, this would be handled by file service
  // For this implementation, we simulate the infrastructure result
  // The fileUri would be processed to generate storage path, mime type, size, and checksum
  const infrastructureResult: RedditLikeAttachmentCollector.IInfrastructureResult =
    {
      storagePath: `/uploads/${v4()}/${props.body.originalFilename}`,
      mimeType: "application/octet-stream", // Would be detected from actual file
      fileSizeBytes: 0, // Would be calculated from actual file
      checksumSha256: "", // Would be calculated from actual file content
    };
  // Collect data using the collector
  const data = await RedditLikeAttachmentCollector.collect({
    body: props.body,
    redditLikeMembers: { id: props.member.id },
    infrastructure: infrastructureResult,
  });
  // Create the attachment record
  const created = await MyGlobal.prisma.reddit_like_attachments.create({
    data,
    ...RedditLikeAttachmentTransformer.select(),
  });
  // Transform and return
  return await RedditLikeAttachmentTransformer.transform(created);
}
