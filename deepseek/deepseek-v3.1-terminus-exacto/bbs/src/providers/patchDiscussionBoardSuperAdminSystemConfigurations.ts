import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
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
  // Extract pagination parameters with defaults
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  // Build WHERE clause based on validation configurations
  const whereConditions: Prisma.discussion_board_system_configurationsWhereInput[] =
    [{ deleted_at: null }];
  // Add search conditions for each configuration validation item
  if (props.body.configurations && props.body.configurations.length > 0) {
    const configConditions = props.body.configurations.map((config) => ({
      OR: [
        {
          config_key: {
            contains: config.config_key,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
        {
          description: {
            contains: config.config_key,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
        { data_type: config.data_type },
        {
          category: {
            contains: config.config_key,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
      ],
    }));
    whereConditions.push({ OR: configConditions });
  }
  const whereInput = {
    AND: whereConditions,
  } satisfies Prisma.discussion_board_system_configurationsWhereInput;
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_system_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSystemConfigurationAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_system_configurations.count({
      where: whereInput,
    });
  // Transform data using the transformer
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
