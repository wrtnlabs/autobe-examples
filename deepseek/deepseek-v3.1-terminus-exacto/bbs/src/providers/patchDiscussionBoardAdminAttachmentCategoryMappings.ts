import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategoryMapping";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAttachmentCategoryMappingAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryMappingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAttachmentCategoryMappings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAttachmentCategoryMapping.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentCategoryMapping.ISummary> {
  // Destructure pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    // Filter by attachment ID if provided
    ...(props.body.attachment_id !== undefined && {
      discussion_board_attachment_id: props.body.attachment_id,
    }),
    // Filter by category ID if provided
    ...(props.body.category_id !== undefined && {
      discussion_board_attachment_category_id: props.body.category_id,
    }),
    // Filter by creation date range if provided
    ...((props.body.created_at_start !== undefined ||
      props.body.created_at_end !== undefined) && {
      created_at: {
        ...(props.body.created_at_start !== undefined && {
          gte: new Date(props.body.created_at_start),
        }),
        ...(props.body.created_at_end !== undefined && {
          lte: new Date(props.body.created_at_end),
        }),
      },
    }),
  } satisfies Prisma.discussion_board_attachment_category_mappingsWhereInput;
  // Execute paginated query
  const data =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...DiscussionBoardAttachmentCategoryMappingAtSummaryTransformer.select(),
      },
    );
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.discussion_board_attachment_category_mappings.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentCategoryMappingAtSummaryTransformer.transform,
  );
  // Return paginated response
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
