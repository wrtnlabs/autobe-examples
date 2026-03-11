import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentThumbnail";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentThumbnail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentThumbnailAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentThumbnailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminThumbnails(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentThumbnail.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentThumbnail.ISummary> {
  // Admin auth is already validated via AdminAuth decorator
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE condition incrementally
  const whereConditions: Prisma.discussion_board_attachment_thumbnailsWhereInput =
    {
      deleted_at: null,
    };
  // Filter by attachment_id
  if (props.body.attachment_id !== undefined) {
    whereConditions.discussion_board_attachment_id = props.body.attachment_id;
  }
  // Filter by size_category
  if (props.body.size_category !== undefined) {
    whereConditions.size_category = props.body.size_category;
  }
  // Filter by width range
  if (
    props.body.width_min !== undefined ||
    props.body.width_max !== undefined
  ) {
    whereConditions.width = {};
    if (props.body.width_min !== undefined) {
      whereConditions.width.gte = props.body.width_min;
    }
    if (props.body.width_max !== undefined) {
      whereConditions.width.lte = props.body.width_max;
    }
  }
  // Filter by height range
  if (
    props.body.height_min !== undefined ||
    props.body.height_max !== undefined
  ) {
    whereConditions.height = {};
    if (props.body.height_min !== undefined) {
      whereConditions.height.gte = props.body.height_min;
    }
    if (props.body.height_max !== undefined) {
      whereConditions.height.lte = props.body.height_max;
    }
  }
  // Filter by creation date range
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    whereConditions.created_at = {};
    if (props.body.created_at_start !== undefined) {
      whereConditions.created_at.gte = new Date(props.body.created_at_start);
    }
    if (props.body.created_at_end !== undefined) {
      whereConditions.created_at.lte = new Date(props.body.created_at_end);
    }
  }
  // Determine ORDER BY
  let orderBy: Prisma.discussion_board_attachment_thumbnailsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "width:asc":
      orderBy = { width: "asc" };
      break;
    case "width:desc":
      orderBy = { width: "desc" };
      break;
    case "height:asc":
      orderBy = { height: "asc" };
      break;
    case "height:desc":
      orderBy = { height: "desc" };
      break;
    case "created_at:desc":
      orderBy = { created_at: "desc" };
      break;
    default: // "created_at:asc" or unspecified
      orderBy = { created_at: "asc" };
      break;
  }
  // Execute queries
  const [thumbnails, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachment_thumbnails.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
      ...DiscussionBoardAttachmentThumbnailAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_attachment_thumbnails.count({
      where: whereConditions,
    }),
  ]);
  // Transform results
  const data = await ArrayUtil.asyncMap(
    thumbnails,
    DiscussionBoardAttachmentThumbnailAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
