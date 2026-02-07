import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminPromotionApprovals(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  // Since the IRequest type is empty {}, we'll use default pagination parameters
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause - since IRequest has no properties, we only filter by active records
  const whereClause = {
    deleted_at: null,
  } satisfies Prisma.discussion_board_administrator_promotion_approvalsWhereInput;
  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_promotion_approvals.findMany(
      {
        where: whereClause,
        include: {
          reviewerAdmin: {
            select: {
              id: true,
              email: true,
              display_name: true,
            },
          },
          promotionRequest: {
            select: {
              id: true,
              reason: true,
              status: true,
              created_at: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { reviewed_at: "desc" },
      },
    ),
    MyGlobal.prisma.discussion_board_administrator_promotion_approvals.count({
      where: whereClause,
    }),
  ]);
  // Transform database records to summary DTO format
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
  }));
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
