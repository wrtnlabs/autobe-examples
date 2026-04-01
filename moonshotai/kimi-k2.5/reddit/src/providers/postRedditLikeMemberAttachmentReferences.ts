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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeAttachmentReferenceTransformer } from "../transformers/RedditLikeAttachmentReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberAttachmentReferences(props: {
  member: MemberPayload;
  body: IRedditLikeAttachmentReference.ICreate;
}): Promise<IRedditLikeAttachmentReference> {
  const attachment = await MyGlobal.prisma.reddit_like_attachments.findUnique({
    where: { id: props.body.attachmentId },
    select: { id: true, deleted_at: true },
  });
  if (attachment === null) {
    throw new HttpException("Attachment not found", 404);
  }
  if (attachment.deleted_at !== null) {
    throw new HttpException("Attachment has been deleted", 400);
  }
  const existingReference =
    await MyGlobal.prisma.reddit_like_attachment_references.findFirst({
      where: {
        attachment_id: props.body.attachmentId,
        reference_type: "profile",
      },
      select: { id: true },
    });
  if (existingReference !== null) {
    throw new HttpException(
      "Attachment reference already exists for this type",
      409,
    );
  }
  const created =
    await MyGlobal.prisma.reddit_like_attachment_references.create({
      data: await RedditLikeAttachmentReferenceCollector.collect({
        body: props.body,
        referenceType: "profile",
      }),
      ...RedditLikeAttachmentReferenceTransformer.select(),
    });
  await MyGlobal.prisma.reddit_like_attachment_reference_of_profiles.create({
    data: {
      id: v4(),
      attachmentReference: { connect: { id: created.id } },
      member: { connect: { id: props.member.id } },
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  return await RedditLikeAttachmentReferenceTransformer.transform(created);
}
