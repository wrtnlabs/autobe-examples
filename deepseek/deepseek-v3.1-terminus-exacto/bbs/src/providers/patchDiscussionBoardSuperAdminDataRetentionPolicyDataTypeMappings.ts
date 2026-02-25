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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminDataRetentionPolicyDataTypeMappings(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardDataRetentionPolicyDataType.IRequest;
}): Promise<IPageIDiscussionBoardDataRetentionPolicyDataType.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions with proper date handling
  const whereConditions: Prisma.discussion_board_data_retention_policy_data_typesWhereInput =
    {
      deleted_at: null,
      ...(props.body.discussion_board_data_retention_policy_id && {
        discussion_board_data_retention_policy_id:
          props.body.discussion_board_data_retention_policy_id,
      }),
      ...(props.body.data_type && {
        data_type: { contains: props.body.data_type },
      }),
    };
  // Handle date range filtering with proper string comparison
  if (props.body.created_at_from) {
    whereConditions.created_at = {
      ...(whereConditions.created_at as any),
      gte: props.body.created_at_from,
    };
  }
  if (props.body.created_at_to) {
    whereConditions.created_at = {
      ...(whereConditions.created_at as any),
      lte: props.body.created_at_to,
    };
  }
  // Validate that referenced retention policies exist and are active
  if (props.body.discussion_board_data_retention_policy_id) {
    const policy =
      await MyGlobal.prisma.discussion_board_data_retention_policies.findUnique(
        {
          where: {
            id: props.body.discussion_board_data_retention_policy_id,
            deleted_at: null,
            is_active: true,
          },
        },
      );
    if (!policy) {
      throw new HttpException(
        "Referenced retention policy not found or inactive",
        400,
      );
    }
  }
  // Build order by based on sort parameters with proper Prisma SortOrder enum values
  const orderByInput =
    props.body.sort === "created_at"
      ? {
          created_at:
            props.body.order === "asc"
              ? Prisma.SortOrder.asc
              : Prisma.SortOrder.desc,
        }
      : props.body.sort === "data_type"
        ? {
            data_type:
              props.body.order === "asc"
                ? Prisma.SortOrder.asc
                : Prisma.SortOrder.desc,
          }
        : { created_at: Prisma.SortOrder.desc };
  // Execute queries
  const data =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.findMany(
      {
        where: whereConditions,
        skip,
        take: limit,
        orderBy: orderByInput,
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_data_retention_policy_data_types.count(
      {
        where: whereConditions,
      },
    );
  // Fetch retention policy data separately
  const retentionPolicyIds = data.map(
    (item) => item.discussion_board_data_retention_policy_id,
  );
  const retentionPolicies =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findMany({
      where: {
        id: { in: retentionPolicyIds },
        deleted_at: null,
      },
    });
  const policyMap = new Map(
    retentionPolicies.map((policy) => [policy.id, policy]),
  );
  // Transform data to response format with proper type handling
  const transformedData: IDiscussionBoardDataRetentionPolicyDataType.ISummary[] =
    data.map((item) => {
      const policy = policyMap.get(
        item.discussion_board_data_retention_policy_id,
      );
      if (!policy) {
        throw new HttpException("Referenced retention policy not found", 500);
      }
      return {
        id: item.id as string & tags.Format<"uuid">,
        data_type: item.data_type,
        created_at: toISOStringSafe(item.created_at) as string &
          tags.Format<"date-time">,
        retentionPolicy: {
          id: policy.id as string & tags.Format<"uuid">,
          policy_name: policy.policy_name,
          retention_period_days: policy.retention_period_days,
          retention_action: policy.retention_action,
          compliance_standard: policy.compliance_standard ?? undefined,
          is_active: policy.is_active,
        } satisfies IDiscussionBoardDataRetentionPolicy.ISummary,
      };
    });
  // Build the correct pagination structure matching the DTO types
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
            records: total satisfies number & tags.Type<"int32"> as number,
            pages: Math.ceil(total / limit) satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0> as number,
          } satisfies IPage.IPagination,
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: transformedData,
  };
}
