import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministrators(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions immutably
  const whereConditions: Prisma.discussion_board_administrator_promotion_requestsWhereInput[] =
    [];
  // Build filters
  if (props.body.status !== undefined && props.body.status !== null) {
    whereConditions.push({ status: props.body.status });
  }
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    whereConditions.push({
      reason: {
        contains: props.body.search,
        mode: Prisma.QueryMode.insensitive,
      },
    });
  }
  // Handle date range filters
  if (
    props.body.created_from !== undefined &&
    props.body.created_from !== null
  ) {
    whereConditions.push({
      created_at: { gte: new Date(props.body.created_from) },
    });
  }
  if (props.body.created_to !== undefined && props.body.created_to !== null) {
    whereConditions.push({
      created_at: { lte: new Date(props.body.created_to) },
    });
  }
  if (
    props.body.approved_from !== undefined &&
    props.body.approved_from !== null
  ) {
    whereConditions.push({
      approved_at: { gte: new Date(props.body.approved_from) },
    });
  }
  if (props.body.approved_to !== undefined && props.body.approved_to !== null) {
    whereConditions.push({
      approved_at: { lte: new Date(props.body.approved_to) },
    });
  }
  if (
    props.body.rejected_from !== undefined &&
    props.body.rejected_from !== null
  ) {
    whereConditions.push({
      rejected_at: { gte: new Date(props.body.rejected_from) },
    });
  }
  if (props.body.rejected_to !== undefined && props.body.rejected_to !== null) {
    whereConditions.push({
      rejected_at: { lte: new Date(props.body.rejected_to) },
    });
  }
  const whereInput =
    whereConditions.length > 0
      ? { AND: whereConditions }
      : ({} satisfies Prisma.discussion_board_administrator_promotion_requestsWhereInput);
  // Get data first
  const data =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        ...DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer.select(),
      },
    );
  // Get count after data query
  const total =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.count(
      {
        where: whereInput,
      },
    );
  // Transform data using loaded transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer.transform,
  );
  // Return with correct pagination structure
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page satisfies number as number,
            limit: limit satisfies number as number,
            records: total satisfies number as number,
            pages: total === 0 ? 0 : Math.ceil(total / limit),
          } satisfies IPage.IPagination,
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    } satisfies IPageIDiscussionBoardSection.IPagination,
  } satisfies IPageIDiscussionBoardAdministratorPromotionApproval.ISummary;
}
