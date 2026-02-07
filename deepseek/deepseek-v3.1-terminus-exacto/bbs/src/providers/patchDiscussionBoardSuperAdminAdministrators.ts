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

export async function patchDiscussionBoardSuperAdminAdministrators(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  // Use default pagination values since IRequest doesn't have page/limit properties
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where conditions - only use properties that exist on IRequest
  const whereInput: Prisma.discussion_board_administratorsWhereInput = {
    deleted_at: null,
    is_active: true,
  };
  // Query administrators with pagination
  const data = await MyGlobal.prisma.discussion_board_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { promoted_at: "desc" },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          email: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_administrators.count({
    where: whereInput,
  });
  // Transform data to match ISummary DTO
  const transformedData = data.map((admin) => ({
    id: admin.id,
    user: {
      id: admin.user.id,
      display_name: admin.user.display_name,
      email: admin.user.email,
    },
    grade: admin.grade,
    promoted_at: toISOStringSafe(admin.promoted_at),
    grade_changed_at: admin.grade_changed_at
      ? toISOStringSafe(admin.grade_changed_at)
      : null,
    is_active: admin.is_active,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
