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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemConfigurationAtSummaryTransformer } from "../transformers/DiscussionBoardSystemConfigurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemConfigurations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemConfiguration.IRequest;
}): Promise<IPageIDiscussionBoardSystemConfiguration.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.discussion_board_system_configurationsWhereInput = {
    deleted_at: null, // Only active configurations
    ...(props.body.search && {
      OR: [
        { key: { contains: props.body.search, mode: "insensitive" as const } },
        {
          value: { contains: props.body.search, mode: "insensitive" as const },
        },
      ],
    }),
    ...(props.body.data_type && { data_type: props.body.data_type }),
  } satisfies Prisma.discussion_board_system_configurationsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.discussion_board_system_configurationsOrderByWithRelationInput =
    props.body.sort === "key"
      ? { key: props.body.sort_direction ?? "asc" }
      : props.body.sort === "created_at"
        ? { created_at: props.body.sort_direction ?? "desc" }
        : props.body.sort === "updated_at"
          ? { updated_at: props.body.sort_direction ?? "desc" }
          : { created_at: "desc" };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardSystemConfigurationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_system_configurations.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSystemConfigurationAtSummaryTransformer.transform,
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
