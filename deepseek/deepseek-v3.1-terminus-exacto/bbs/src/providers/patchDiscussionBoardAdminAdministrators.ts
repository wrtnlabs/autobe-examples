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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdministrators(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = 1; // Default to page 1 if not specified
  const limit = 100; // Default limit of 100 records
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on available filters
  const whereInput: Prisma.discussion_board_administratorsWhereInput = {
    deleted_at: null,
    // Additional filters can be implemented here based on body parameters
  };
  // Get paginated data with user information
  const data = await MyGlobal.prisma.discussion_board_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          email: true,
        },
      },
      admin: {
        select: {
          id: true,
          display_name: true,
          email: true,
        },
      },
      superAdmin: {
        select: {
          id: true,
          email: true,
          privilege_level: true,
        },
      },
    },
    orderBy: { promoted_at: "desc" },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_administrators.count({
    where: whereInput,
  });
  // Transform to the required ISummary format (only id field)
  const transformedData = data.map((record) => ({
    id: record.id,
  }));
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
