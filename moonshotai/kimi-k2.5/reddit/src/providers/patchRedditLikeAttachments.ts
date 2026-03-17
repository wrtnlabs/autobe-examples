import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachment";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAttachments(props: {
  body: IRedditLikeAttachment.IRequest;
}): Promise<IPageIRedditLikeAttachment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions dynamically
  const whereConditions: Prisma.reddit_like_attachmentsWhereInput = {
    deleted_at: null,
    ...(props.body.uploadedByMemberId !== null && {
      uploaded_by_member_id: props.body.uploadedByMemberId,
    }),
    ...(props.body.mimeType !== null && {
      mime_type: props.body.mimeType,
    }),
    ...(props.body.originalFilename !== null && {
      original_filename: {
        contains: props.body.originalFilename,
        mode: "insensitive" as const,
      },
    }),
  };
  // If referenceType filter is provided, we need to join with attachment_references
  let attachmentIds: string[] | undefined;
  if (props.body.referenceType !== null) {
    const references =
      await MyGlobal.prisma.reddit_like_attachment_references.findMany({
        where: {
          reference_type: props.body.referenceType,
        },
        select: {
          attachment_id: true,
        },
      });
    attachmentIds = references.map((r) => r.attachment_id);
    if (attachmentIds.length === 0) {
      // No attachments match the reference type filter
      return {
        data: [],
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      };
    }
    whereConditions.id = {
      in: attachmentIds,
    };
  }
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_attachments.count({
    where: whereConditions,
  });
  // Fetch attachments with member info
  const attachments = await MyGlobal.prisma.reddit_like_attachments.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      original_filename: true,
      mime_type: true,
      file_size_bytes: true,
      created_at: true,
      uploadedByMember: {
        select: {
          id: true,
          email: true,
          username: true,
          email_verified: true,
          created_at: true,
        } satisfies Prisma.reddit_like_membersSelect,
      },
    },
  });
  // Transform to response format
  const data: IRedditLikeAttachment.ISummary[] = attachments.map(
    (attachment) =>
      ({
        id: attachment.id as string & tags.Format<"uuid">,
        originalFilename: attachment.original_filename,
        mimeType: attachment.mime_type,
        fileSizeBytes: attachment.file_size_bytes as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        uploadedByMember: {
          id: attachment.uploadedByMember.id as string & tags.Format<"uuid">,
          email: attachment.uploadedByMember.email as string &
            tags.Format<"email">,
          username: attachment.uploadedByMember.username,
          emailVerified: attachment.uploadedByMember.email_verified,
          createdAt: toISOStringSafe(attachment.uploadedByMember.created_at),
        } satisfies IRedditLikeMember.ISummary,
        createdAt: toISOStringSafe(attachment.created_at),
      }) satisfies IRedditLikeAttachment.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
