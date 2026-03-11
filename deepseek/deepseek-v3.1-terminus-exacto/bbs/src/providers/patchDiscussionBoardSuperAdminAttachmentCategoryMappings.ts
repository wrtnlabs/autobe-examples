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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentCategoryMappingAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryMappingAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAttachmentCategoryMappings(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentCategoryMapping.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentCategoryMapping.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Construct WHERE clause with all filters
  const whereInput = {
    AND: [
      // Filter by attachment_id if provided
      props.body.attachment_id !== undefined
        ? { attachment: { id: props.body.attachment_id } }
        : undefined,
      // Filter by category_id if provided
      props.body.category_id !== undefined
        ? { category: { id: props.body.category_id } }
        : undefined,
      // Filter by creation date range if provided
      props.body.created_at_start !== undefined &&
      props.body.created_at_end !== undefined
        ? {
            created_at: {
              gte: new Date(props.body.created_at_start),
              lte: new Date(props.body.created_at_end),
            },
          }
        : props.body.created_at_start !== undefined
          ? { created_at: { gte: new Date(props.body.created_at_start) } }
          : props.body.created_at_end !== undefined
            ? { created_at: { lte: new Date(props.body.created_at_end) } }
            : undefined,
    ].filter((clause) => clause !== undefined),
  } satisfies Prisma.discussion_board_attachment_category_mappingsWhereInput;
  // Execute paginated query with proper selection
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
