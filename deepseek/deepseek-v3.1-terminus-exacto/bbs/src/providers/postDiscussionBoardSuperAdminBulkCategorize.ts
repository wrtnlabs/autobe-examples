import { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAttachmentCategoryMappingAtResponseTransformer } from "../transformers/DiscussionBoardAttachmentCategoryMappingAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminBulkCategorize(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAttachmentCategoryMapping.IRequest;
}): Promise<IDiscussionBoardAttachmentCategoryMapping.IResponse> {
  // This operation is for searching/filtering existing mappings, not bulk creation
  // Based on the IRequest structure with filter parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause based on filter parameters
  const whereClause: Prisma.discussion_board_attachment_category_mappingsWhereInput =
    {
      AND: [
        props.body.attachment_id
          ? { discussion_board_attachment_id: props.body.attachment_id }
          : {},
        props.body.category_id
          ? { discussion_board_attachment_category_id: props.body.category_id }
          : {},
        props.body.created_at_start && props.body.created_at_end
          ? {
              created_at: {
                gte: new Date(props.body.created_at_start),
                lte: new Date(props.body.created_at_end),
              },
            }
          : {},
      ].filter((condition) => Object.keys(condition).length > 0),
    };
  // Execute the query
  const [mappings, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachment_category_mappings.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAttachmentCategoryMappingAtResponseTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_attachment_category_mappings.count({
      where: whereClause,
    }),
  ]);
  // Transform the results
  const transformedMappings =
    await DiscussionBoardAttachmentCategoryMappingAtResponseTransformer.transform(
      mappings,
    );
  return transformedMappings;
}
