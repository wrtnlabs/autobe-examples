import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAttachment";
import { IPageICommunityPlatformCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommentsCommentIdAttachments(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentAttachment.IRequest;
}): Promise<IPageICommunityPlatformCommentAttachment.ISummary> {
  const {
    user_session_id,
    created_at_from,
    created_at_to,
    uri_pattern,
    limit = 20,
    offset = 0,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body ?? {};

  // Enforce user can only filter by their own session
  if (user_session_id && user_session_id !== props.user.session_id) {
    throw new HttpException(
      "Forbidden: Cannot query with another user's session.",
      403,
    );
  }

  // Build created_at filter properly
  let createdAtFilter: Record<string, string> | undefined = undefined;
  if (created_at_from || created_at_to) {
    createdAtFilter = {};
    if (created_at_from) createdAtFilter.gte = created_at_from;
    if (created_at_to) createdAtFilter.lte = created_at_to;
  }

  // Build where condition for Prisma
  const where: Record<string, unknown> = {
    comment_id: props.commentId,
    ...(user_session_id && { user_session_id }),
    ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
    ...(uri_pattern && { uri: { contains: uri_pattern } }),
  };

  // Only allow sorting by created_at or uri
  const validSortBy =
    sort_by === "created_at" || sort_by === "uri" ? sort_by : "created_at";
  const validSortOrder =
    sort_order === "asc" || sort_order === "desc" ? sort_order : "desc";

  const orderBy = [{ [validSortBy]: validSortOrder }];

  // Defensive limit for page size
  const finalLimit = limit > 100 ? 100 : limit;

  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_attachments.findMany({
      where,
      skip: offset,
      take: finalLimit,
      orderBy,
    }),
    MyGlobal.prisma.community_platform_comment_attachments.count({ where }),
  ]);

  return {
    data: attachments.map((att) => ({
      id: att.id,
      uri: att.uri,
      created_at: toISOStringSafe(att.created_at),
    })),
    pagination: {
      current: Math.floor(offset / finalLimit) + 1,
      limit: finalLimit,
      records: total,
      pages: Math.ceil(total / finalLimit),
    },
  };
}
