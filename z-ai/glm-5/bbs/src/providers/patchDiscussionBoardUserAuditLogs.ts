import { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminActionLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminActionLogAtSummaryTransformer } from "../transformers/DiscussionBoardAdminActionLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserAuditLogs(props: {
  user: UserPayload;
  body: IDiscussionBoardAdminActionLog.IRequest;
}): Promise<IPageIDiscussionBoardAdminActionLog.ISummary> {
  // 1. Verify user has administrator or super_administrator permission
  const currentUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.user.id },
      select: { permission_level: true },
    });
  if (
    currentUser.permission_level !== "ADMINISTRATOR" &&
    currentUser.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException("Forbidden - Administrator access required", 403);
  }
  // 2. Build pagination parameters
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // 3. Build WHERE clause with filters
  const whereInput = {
    ...(props.body.administrator_id && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_type && { target_type: props.body.target_type }),
    ...(props.body.created_from && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to && {
      created_at: { lte: new Date(props.body.created_to) },
    }),
    ...(props.body.search && {
      OR: [
        {
          target_title: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          reason: { contains: props.body.search, mode: "insensitive" as const },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_admin_action_logsWhereInput;
  // 4. Execute findMany query with transformer select
  const records =
    await MyGlobal.prisma.discussion_board_admin_action_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminActionLogAtSummaryTransformer.select(),
    });
  // 5. Execute count query (sequential, not Promise.all per pattern)
  const total = await MyGlobal.prisma.discussion_board_admin_action_logs.count({
    where: whereInput,
  });
  // 6. Transform results
  const data = await ArrayUtil.asyncMap(
    records,
    DiscussionBoardAdminActionLogAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        page,
      ),
      limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(limit),
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
