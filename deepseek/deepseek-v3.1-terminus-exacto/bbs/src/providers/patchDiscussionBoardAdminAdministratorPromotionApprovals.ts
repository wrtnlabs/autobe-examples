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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdministratorPromotionApprovals(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions for promotion requests
  const whereInput: Prisma.discussion_board_administrator_promotion_requestsWhereInput =
    {
      ...(props.body.status && { status: props.body.status }),
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
      ...(props.body.search && {
        OR: [
          { reason: { contains: props.body.search, mode: "insensitive" } },
          {
            reviewer_notes: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };
  // Query data with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_promotion_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_administrator_promotion_requests.count({
      where: whereInput,
    }),
  ]);
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer.transform,
  );
  // Construct a valid pagination object
  const pageCurrent = page satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const pageLimit = limit satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const pageRecords = total satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const pagePages = Math.ceil(total / limit) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  return {
    data: transformedData,
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: pageCurrent,
            limit: pageLimit,
            records: pageRecords,
            pages: pagePages,
          } satisfies IPage.IPagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
  } satisfies IPageIDiscussionBoardAdministratorPromotionApproval.ISummary["pagination"];
}
