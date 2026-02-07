import { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
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

export async function patchDiscussionBoardSuperAdminAnalyticsModerationActionTypes(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardModerationActionType.IRequest;
}): Promise<IPageIDiscussionBoardModerationActionType.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    ...(props.body.category !== undefined && { category: props.body.category }),
    ...(props.body.severity_level !== undefined && {
      severity_level: props.body.severity_level,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_moderation_action_typesWhereInput;
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.discussion_board_moderation_action_types.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        severity_level: true,
        is_active: true,
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_moderation_action_types.count({
      where: whereInput,
    });
  // Transform to summary DTO
  const summaries = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    code: item.code,
    name: item.name,
    category: item.category,
    severity_level: item.severity_level,
    is_active: item.is_active,
  }));
  return {
    data: summaries,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
