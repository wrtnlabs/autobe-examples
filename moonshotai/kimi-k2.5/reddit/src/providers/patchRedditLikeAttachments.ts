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
import { RedditLikeAttachmentAtSummaryTransformer } from "../transformers/RedditLikeAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAttachments(props: {
  body: IRedditLikeAttachment.IRequest;
}): Promise<IPageIRedditLikeAttachment.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.reddit_like_attachmentsWhereInput = {
    deleted_at: null,
    ...(props.body.uploadedByMemberId && {
      uploaded_by_member_id: props.body.uploadedByMemberId,
    }),
    ...(props.body.originalFilename && {
      original_filename: {
        contains: props.body.originalFilename,
        mode: "insensitive",
      },
    }),
    ...(props.body.mimeType && {
      mime_type: props.body.mimeType,
    }),
  };
  // Handle referenceType filter by joining with attachment_references
  if (props.body.referenceType) {
    const references =
      await MyGlobal.prisma.reddit_like_attachment_references.findMany({
        where: {
          reference_type: props.body.referenceType,
        },
        select: { attachment_id: true },
      });
    const attachmentIds = references.map((r) => r.attachment_id);
    if (attachmentIds.length === 0) {
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
    whereInput.id = { in: attachmentIds };
  }
  // Query attachments with pagination
  const attachments = await MyGlobal.prisma.reddit_like_attachments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditLikeAttachmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_attachments.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    attachments,
    RedditLikeAttachmentAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
