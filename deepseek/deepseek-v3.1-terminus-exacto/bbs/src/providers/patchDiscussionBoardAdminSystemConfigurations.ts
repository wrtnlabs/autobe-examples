import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
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

export async function patchDiscussionBoardAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemConfiguration.IRequest;
}): Promise<IPageIDiscussionBoardSystemConfiguration.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_system_configurationsWhereInput = {
    deleted_at: null,
  };
  // Apply search filter
  if (props.body.search && props.body.search.trim().length > 0) {
    whereInput.OR = [
      { key: { contains: props.body.search, mode: "insensitive" } },
      { value: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Apply data_type filter
  if (props.body.data_type !== undefined && props.body.data_type !== null) {
    whereInput.data_type = props.body.data_type;
  }
  // Build ORDER BY clause with type safety
  const orderByField = props.body.sort ?? "created_at";
  const orderDirection = props.body.sort_direction ?? "desc";
  const orderByInput: Prisma.discussion_board_system_configurationsOrderByWithRelationInput =
    {};
  if (
    orderByField === "key" ||
    orderByField === "created_at" ||
    orderByField === "updated_at"
  ) {
    orderByInput[orderByField] = orderDirection;
  } else {
    orderByInput.created_at = orderDirection;
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
    }),
    MyGlobal.prisma.discussion_board_system_configurations.count({
      where: whereInput,
    }),
  ]);
  // Transform data to DTO
  const transformedData = data.map((config) => ({
    id: config.id as string & tags.Format<"uuid">,
    key: config.key,
    data_type: config.data_type,
    value: config.value,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
