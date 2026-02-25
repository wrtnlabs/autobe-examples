import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemConfigurations(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSystemConfiguration.IRequest;
}): Promise<IPageIDiscussionBoardSystemConfiguration.ISummary> {
  // Extract pagination parameters with proper defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE conditions with type safety
  const whereInput: Prisma.discussion_board_system_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.category !== undefined &&
      props.body.category !== null && { category: props.body.category }),
    ...(props.body.data_type !== undefined &&
      props.body.data_type !== null && { data_type: props.body.data_type }),
    ...(props.body.is_sensitive !== undefined &&
      props.body.is_sensitive !== null && {
        is_sensitive: props.body.is_sensitive,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.trim() !== "" && {
        OR: [
          {
            config_key: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  };
  // Execute paginated query with sequential awaits for better error handling
  const data =
    await MyGlobal.prisma.discussion_board_system_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        config_key: true,
        data_type: true,
        category: true,
        is_sensitive: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_system_configurations.count({
      where: whereInput,
    });
  // Transform data with proper satisfies clauses
  const transformedData = data.map(
    (item) =>
      ({
        config_key: item.config_key,
        data_type: item.data_type,
        category: item.category,
        is_sensitive: item.is_sensitive,
      }) satisfies IDiscussionBoardSystemConfiguration.ISummary,
  );
  // Build nested pagination structure exactly matching DTO
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: pagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardSystemConfiguration.ISummary;
}
