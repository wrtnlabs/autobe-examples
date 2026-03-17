import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeAttachmentReferenceCollector } from "../collectors/RedditLikeAttachmentReferenceCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeAttachmentReferenceTransformer } from "../transformers/RedditLikeAttachmentReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberAttachmentReferences(props: {
  member: AdminPayload;
  body: IRedditLikeAttachmentReference.ICreate;
}): Promise<IRedditLikeAttachmentReference> {
  // Validate attachment exists
  await MyGlobal.prisma.reddit_like_attachments.findUniqueOrThrow({
    where: { id: props.body.attachmentId },
  });
  // Create attachment reference using collector
  const data = await RedditLikeAttachmentReferenceCollector.collect({
    body: props.body,
    referenceType: "profile",
    profile: {
      memberId: props.member.id,
    },
  });
  const created =
    await MyGlobal.prisma.reddit_like_attachment_references.create({
      data,
      ...RedditLikeAttachmentReferenceTransformer.select(),
    });
  return await RedditLikeAttachmentReferenceTransformer.transform(created);
}
