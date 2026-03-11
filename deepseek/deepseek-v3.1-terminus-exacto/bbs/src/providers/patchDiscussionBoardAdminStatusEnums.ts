import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminStatusEnums(props: {
  admin: AdminPayload;
  body: IDiscussionBoardStatusEnum.IRequest;
}): Promise<IPageIDiscussionBoardStatusEnum.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereInput: Prisma.discussion_board_status_enumsWhereInput = {
    deleted_at: null,
    ...(props.body.entity_type !== undefined && {
      entity_type: props.body.entity_type,
    }),
    ...(props.body.value !== undefined && {
      value: { contains: props.body.value },
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  };
  try {
    // Execute queries
    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_status_enums.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { sort_order: "asc" },
      }),
      MyGlobal.prisma.discussion_board_status_enums.count({
        where: whereInput,
      }),
    ]);
    // Transform data to DTO format
    const transformedData: IDiscussionBoardStatusEnum.ISummary[] = data.map(
      (item) => ({
        id: item.id as string & tags.Format<"uuid">,
        entity_type: item.entity_type,
        value: item.value,
        description: item.description,
        sort_order: item.sort_order,
        is_active: item.is_active,
      }),
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
  } catch (error) {
    throw new HttpException(
      "Failed to retrieve status enumeration values",
      500,
    );
  }
}
