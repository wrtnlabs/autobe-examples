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

export async function patchDiscussionBoardSuperAdminPromotionAnalytics(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions from request filters
  const whereConditions: Prisma.discussion_board_administrator_promotion_requestsWhereInput =
    {
      ...(props.body.status && { status: props.body.status }),
      ...(props.body.search && {
        reason: { contains: props.body.search, mode: "insensitive" },
      }),
      ...(props.body.created_from && {
        created_at: { gte: new Date(props.body.created_from) },
      }),
      ...(props.body.created_to && {
        created_at: { lte: new Date(props.body.created_to) },
      }),
      ...(props.body.approved_from && {
        approved_at: { gte: new Date(props.body.approved_from) },
      }),
      ...(props.body.approved_to && {
        approved_at: { lte: new Date(props.body.approved_to) },
      }),
      ...(props.body.rejected_from && {
        rejected_at: { gte: new Date(props.body.rejected_from) },
      }),
      ...(props.body.rejected_to && {
        rejected_at: { lte: new Date(props.body.rejected_to) },
      }),
    };
  // Get paginated data with transformer select
  const data =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findMany(
      {
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer.select(),
      },
    );
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.count(
      {
        where: whereConditions,
      },
    );
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number,
      limit: limit satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number,
      records: total satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0> as number,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardAdministratorPromotionApproval.ISummary;
}
