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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentDownloadAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentDownloadAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAnalyticsDownloads(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentDownload.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentDownload.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.discussion_board_attachment_id !== undefined && {
      discussion_board_attachment_id: props.body.discussion_board_attachment_id,
    }),
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.user_agent !== undefined && {
      user_agent: { contains: props.body.user_agent },
    }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_end !== undefined && {
        created_at: {
          gte: new Date(props.body.created_at_start),
          lte: new Date(props.body.created_at_end),
        },
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_end === undefined && {
        created_at: {
          gte: new Date(props.body.created_at_start),
        },
      }),
    ...(props.body.created_at_start === undefined &&
      props.body.created_at_end !== undefined && {
        created_at: {
          lte: new Date(props.body.created_at_end),
        },
      }),
  } satisfies Prisma.discussion_board_attachment_downloadsWhereInput;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachment_downloads.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardAttachmentDownloadAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_attachment_downloads.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentDownloadAtSummaryTransformer.transform,
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
