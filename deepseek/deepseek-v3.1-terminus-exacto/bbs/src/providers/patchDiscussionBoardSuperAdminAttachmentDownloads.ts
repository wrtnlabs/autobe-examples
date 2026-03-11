import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentDownload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentDownloadAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentDownloadAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAttachmentDownloads(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentDownload.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentDownload.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with comprehensive filtering
  const whereConditions: Record<string, any> = {
    deleted_at: null, // Soft delete filter
  };
  // Attachment ID filter
  if (props.body.discussion_board_attachment_id !== undefined) {
    whereConditions.discussion_board_attachment_id =
      props.body.discussion_board_attachment_id;
  }
  // Actor type filter
  if (props.body.actor_type !== undefined) {
    whereConditions.actor_type = props.body.actor_type;
  }
  // IP address filter
  if (props.body.ip !== undefined) {
    whereConditions.ip = props.body.ip;
  }
  // User agent filter (case-insensitive contains)
  if (props.body.user_agent !== undefined) {
    whereConditions.user_agent = {
      contains: props.body.user_agent,
      mode: "insensitive",
    };
  }
  // Date range filtering (handle individually)
  if (props.body.created_at_start !== undefined) {
    whereConditions.created_at = {
      ...((whereConditions.created_at as object) || {}),
      gte: new Date(props.body.created_at_start),
    };
  }
  if (props.body.created_at_end !== undefined) {
    whereConditions.created_at = {
      ...((whereConditions.created_at as object) || {}),
      lte: new Date(props.body.created_at_end),
    };
  }
  const whereInput =
    whereConditions as Prisma.discussion_board_attachment_downloadsWhereInput;
  // Execute queries
  const data =
    await MyGlobal.prisma.discussion_board_attachment_downloads.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardAttachmentDownloadAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_attachment_downloads.count({
      where: whereInput,
    });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAttachmentDownloadAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
