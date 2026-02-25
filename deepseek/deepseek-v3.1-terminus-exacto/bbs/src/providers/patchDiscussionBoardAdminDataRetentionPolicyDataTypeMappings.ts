import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicyDataType";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function patchDiscussionBoardAdminDataRetentionPolicyDataTypeMappings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataRetentionPolicyDataType.IRequest;
}): Promise<IPageIDiscussionBoardDataRetentionPolicyDataType.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereFilter: Prisma.discussion_board_data_retention_policy_data_typesWhereInput =
    {
      deleted_at: null,
      retentionPolicy: {
        deleted_at: null,
        is_active: true,
      },
      ...(props.body.discussion_board_data_retention_policy_id && {
        discussion_board_data_retention_policy_id:
          props.body.discussion_board_data_retention_policy_id,
      }),
      ...(props.body.data_type && {
        data_type: { contains: props.body.data_type, mode: "insensitive" },
      }),
      ...(props.body.created_at_from && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
      ...(props.body.created_at_to && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
    };
  // Build ORDER BY clause
  const orderByFilter: Prisma.discussion_board_data_retention_policy_data_typesOrderByWithRelationInput =
    props.body.sort === "data_type"
      ? { data_type: props.body.order ?? "asc" }
      : { created_at: props.body.order ?? "desc" };
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findMany({
      where: whereFilter,
      include: {
        retentionPolicy: {
          select: {
            id: true,
            policy_name: true,
            retention_period_days: true,
            retention_action: true,
            compliance_standard: true,
            is_active: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: orderByFilter,
    }),
    MyGlobal.prisma.discussion_board_data_retention_policy_data_types.count({
      where: whereFilter,
    }),
  ]);
  // Transform results with ISO string conversion
  const transformedData = data.map((item) => {
    const retentionPolicy: IDiscussionBoardDataRetentionPolicy.ISummary = {
      id: item.retentionPolicy.id,
      policy_name: item.retentionPolicy.policy_name,
      retention_period_days: item.retentionPolicy.retention_period_days,
      retention_action: item.retentionPolicy.retention_action,
      compliance_standard:
        item.retentionPolicy.compliance_standard ?? undefined,
      is_active: item.retentionPolicy.is_active,
    };
    const mapping: IDiscussionBoardDataRetentionPolicyDataType.ISummary = {
      id: item.id,
      data_type: item.data_type,
      created_at: toISOStringSafe(item.created_at),
      retentionPolicy,
    };
    return mapping;
  });
  // Create pagination object
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  // Return the correct structure
  return {
    pagination: pagination,
    data: transformedData,
  };
}
