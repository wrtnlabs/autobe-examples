import { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAttachmentCategoryAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberOrganizeAttachments(props: {
  member: MemberPayload;
  body: IDiscussionBoardAttachmentCategory.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on request filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.parent_id !== undefined && {
      parent_id: props.body.parent_id === null ? null : props.body.parent_id,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" as const } },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_attachment_categoriesWhereInput;
  // Get paginated data with transformer select
  const data =
    await MyGlobal.prisma.discussion_board_attachment_categories.findMany({
      where: whereInput,
      orderBy: {
        parent_id: "asc",
        order_index: "asc",
        created_at: "desc",
      } satisfies Prisma.discussion_board_attachment_categoriesOrderByWithRelationInput,
      skip,
      take: limit,
      ...DiscussionBoardAttachmentCategoryAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.discussion_board_attachment_categories.count({
      where: whereInput,
    });
  // Transform each record using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentCategoryAtSummaryTransformer.transform,
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
