import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSearchAttachments(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build base WHERE clause
  const whereConditions: Prisma.discussion_board_attachmentsWhereInput[] = [
    { deleted_at: null },
  ];
  // Filename search (ILIKE pattern matching)
  if (props.body.search) {
    whereConditions.push({
      filename: {
        contains: props.body.search,
        mode: Prisma.QueryMode.insensitive,
      },
    });
  }
  // Exact filetype filter
  if (props.body.filetype) {
    whereConditions.push({ filetype: props.body.filetype });
  }
  // Exact MIME type filter
  if (props.body.mime_type) {
    whereConditions.push({ mime_type: props.body.mime_type });
  }
  // File size range filtering
  if (props.body.size_min !== undefined || props.body.size_max !== undefined) {
    const sizeCondition: Prisma.IntFilter = {};
    if (props.body.size_min !== undefined) {
      sizeCondition.gte = props.body.size_min;
    }
    if (props.body.size_max !== undefined) {
      sizeCondition.lte = props.body.size_max;
    }
    whereConditions.push({ size_bytes: sizeCondition });
  }
  // Upload date range filtering
  if (props.body.created_after || props.body.created_before) {
    const dateCondition: Prisma.DateTimeFilter = {};
    if (props.body.created_after) {
      dateCondition.gte = new Date(props.body.created_after);
    }
    if (props.body.created_before) {
      dateCondition.lte = new Date(props.body.created_before);
    }
    whereConditions.push({ created_at: dateCondition });
  }
  // Category filtering (if category IDs provided in request)
  // Note: This requires extending IRequest to include category filtering
  // For now, implement basic category filtering if category parameter exists
  const whereInput: Prisma.discussion_board_attachmentsWhereInput = {
    AND: whereConditions,
  };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      } as Prisma.discussion_board_attachmentsOrderByWithRelationInput,
      ...DiscussionBoardAttachmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_attachments.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentAtSummaryTransformer.transform,
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
