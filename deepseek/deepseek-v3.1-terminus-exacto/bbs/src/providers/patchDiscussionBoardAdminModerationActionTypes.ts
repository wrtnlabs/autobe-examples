import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardModerationActionTypeAtSummaryTransformer } from "../transformers/DiscussionBoardModerationActionTypeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminModerationActionTypes(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationActionType.IRequest;
}): Promise<IPageIDiscussionBoardModerationActionType.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with proper null/undefined handling
  const whereInput: Prisma.discussion_board_moderation_action_typesWhereInput =
    {
      ...(props.body.category !== undefined &&
        props.body.category !== null && {
          category: props.body.category,
        }),
      ...(props.body.severity_level !== undefined &&
        props.body.severity_level !== null && {
          severity_level: props.body.severity_level,
        }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
    };
  // Add search condition if provided
  if (props.body.search) {
    whereInput.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Execute queries sequentially - findMany first, then count
  const data =
    await MyGlobal.prisma.discussion_board_moderation_action_types.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { code: "asc" },
      ...DiscussionBoardModerationActionTypeAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_moderation_action_types.count({
      where: whereInput,
    });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardModerationActionTypeAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
