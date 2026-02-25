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

export async function patchDiscussionBoardSuperAdminAdministratorPromotionApprovals(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.discussion_board_administrator_promotion_requestsWhereInput =
    {
      ...(props.body.status !== undefined &&
        props.body.status !== null && { status: props.body.status }),
      ...(props.body.search !== undefined && {
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
      ...(props.body.created_from !== undefined &&
        props.body.created_from !== null && {
          created_at: { gte: props.body.created_from },
        }),
      ...(props.body.created_to !== undefined &&
        props.body.created_to !== null && {
          created_at: { lte: props.body.created_to },
        }),
      ...(props.body.approved_from !== undefined &&
        props.body.approved_from !== null && {
          approved_at: { gte: props.body.approved_from },
        }),
      ...(props.body.approved_to !== undefined &&
        props.body.approved_to !== null && {
          approved_at: { lte: props.body.approved_to },
        }),
      ...(props.body.rejected_from !== undefined &&
        props.body.rejected_from !== null && {
          rejected_at: { gte: props.body.rejected_from },
        }),
      ...(props.body.rejected_to !== undefined &&
        props.body.rejected_to !== null && {
          rejected_at: { lte: props.body.rejected_to },
        }),
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_promotion_requests.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    }),
    MyGlobal.prisma.discussion_board_administrator_promotion_requests.count({
      where: whereConditions,
    }),
  ]);
  const pagination: IPage.IPagination = {
    current: page as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
    records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: Math.ceil(total / limit) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
  const dataItems: IDiscussionBoardAdministratorPromotionApproval.ISummary[] =
    data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      user: {
        id: item.user.id as string & tags.Format<"uuid">,
        display_name: item.user.display_name as string,
        bio: item.user.bio as string | null | undefined,
        created_at: toISOStringSafe(item.user.created_at) as string &
          tags.Format<"date-time">,
      },
      reason: item.reason as string,
      status: item.status as "pending" | "approved" | "rejected",
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      approved_at: item.approved_at
        ? (toISOStringSafe(item.approved_at) as string &
            tags.Format<"date-time">)
        : null,
      rejected_at: item.rejected_at
        ? (toISOStringSafe(item.rejected_at) as string &
            tags.Format<"date-time">)
        : null,
      reviewer_notes: item.reviewer_notes as string | null,
    }));
  // Correct return structure - flat object with pagination and data properties
  return {
    pagination,
    data: dataItems,
  };
}
