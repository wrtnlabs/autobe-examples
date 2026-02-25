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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminPromotionRequests(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.discussion_board_administrator_promotion_requestsWhereInput =
    {
      ...(props.body.status && { status: props.body.status }),
      ...(props.body.created_from && {
        created_at: { gte: props.body.created_from },
      }),
      ...(props.body.created_to && {
        created_at: { lte: props.body.created_to },
      }),
      ...(props.body.approved_from &&
        props.body.approved_from !== null && {
          approved_at: { gte: props.body.approved_from, not: null },
        }),
      ...(props.body.approved_to &&
        props.body.approved_to !== null && {
          approved_at: { lte: props.body.approved_to, not: null },
        }),
      ...(props.body.rejected_from &&
        props.body.rejected_from !== null && {
          rejected_at: { gte: props.body.rejected_from, not: null },
        }),
      ...(props.body.rejected_to &&
        props.body.rejected_to !== null && {
          rejected_at: { lte: props.body.rejected_to, not: null },
        }),
      ...(props.body.search && {
        reason: { contains: props.body.search, mode: "insensitive" },
      }),
    };
  // Execute sequential queries
  const data =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findMany(
      {
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              created_at: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.count(
      {
        where: whereConditions,
      },
    );
  // Transform data
  const transformedData: IDiscussionBoardAdministratorPromotionApproval.ISummary[] =
    data.map((item) => {
      const userSummary: IDiscussionBoardUser.ISummary = {
        id: item.user.id,
        display_name: item.user.display_name,
        bio: item.user.bio ?? null,
        created_at: toISOStringSafe(item.user.created_at),
      };
      return {
        id: item.id,
        user: userSummary,
        reason: item.reason,
        status: typia.assert<"pending" | "approved" | "rejected">(item.status),
        created_at: toISOStringSafe(item.created_at),
        approved_at: item.approved_at
          ? toISOStringSafe(item.approved_at)
          : null,
        rejected_at: item.rejected_at
          ? toISOStringSafe(item.rejected_at)
          : null,
        reviewer_notes: item.reviewer_notes,
      };
    });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return typia.assert<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary>(
    {
      pagination,
      data: transformedData,
    },
  );
}
