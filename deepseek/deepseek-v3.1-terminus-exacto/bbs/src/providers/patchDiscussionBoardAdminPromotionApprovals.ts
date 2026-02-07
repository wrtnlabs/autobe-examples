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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminPromotionApprovals(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  // Build WHERE conditions based on request filters
  const whereInput: Prisma.discussion_board_administrator_promotion_approvalsWhereInput =
    {
      deleted_at: null,
    };
  // Handle pagination
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query data with proper transformer select
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_administrator_promotion_approvals.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { reviewed_at: "desc" },
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    ),
    MyGlobal.prisma.discussion_board_administrator_promotion_approvals.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await Promise.all(
    data.map(
      DiscussionBoardAdministratorPromotionApprovalTransformer.transform,
    ),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
