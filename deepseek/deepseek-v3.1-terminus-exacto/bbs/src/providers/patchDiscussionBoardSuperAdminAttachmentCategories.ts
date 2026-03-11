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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentCategoryAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAttachmentCategories(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentCategory.IRequest;
}): Promise<IPageIDiscussionBoardAttachmentCategory.ISummary> {
  // Build WHERE conditions from request
  const whereInput: Prisma.discussion_board_attachment_categoriesWhereInput = {
    deleted_at: null,
    ...((props.body.parent_id === null ||
      props.body.parent_id !== undefined) && {
      parent_id: props.body.parent_id === null ? null : props.body.parent_id,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.search &&
      props.body.search.trim() !== "" && {
        OR: [
          { name: { contains: props.body.search, mode: "insensitive" } },
          { description: { contains: props.body.search, mode: "insensitive" } },
        ],
      }),
  };
  // Pagination calculations
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  // Query with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachment_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { order_index: "asc" },
      ...DiscussionBoardAttachmentCategoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_attachment_categories.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentCategoryAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
