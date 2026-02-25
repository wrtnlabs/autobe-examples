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

export async function patchDiscussionBoardUserAdminActionLogs(props: {
  user: UserPayload;
  body: IDiscussionBoardAdminActionLog.IRequest;
}): Promise<IPageIDiscussionBoardAdminActionLog.ISummary> {
  // Verify user has administrator permission
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { permission_level: true },
  });
  if (
    user.permission_level !== "ADMINISTRATOR" &&
    user.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException("Forbidden - Administrator access required", 403);
  }
  // Build pagination parameters with defaults
  const page = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    props.body.page ?? 1,
  );
  const limit = typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
    props.body.limit ?? 20,
  );
  const skip = (page - 1) * limit;
  // Build WHERE conditions from filter parameters
  const whereInput = {
    ...(props.body.administrator_id !== undefined && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.created_from !== undefined &&
      props.body.created_to !== undefined && {
        created_at: {
          gte: new Date(props.body.created_from),
          lte: new Date(props.body.created_to),
        },
      }),
    ...(props.body.created_from !== undefined &&
      props.body.created_to === undefined && {
        created_at: { gte: new Date(props.body.created_from) },
      }),
    ...(props.body.created_to !== undefined &&
      props.body.created_from === undefined && {
        created_at: { lte: new Date(props.body.created_to) },
      }),
    ...(props.body.search !== undefined && {
      OR: [
        { target_title: { contains: props.body.search, mode: "insensitive" } },
        { reason: { contains: props.body.search, mode: "insensitive" } },
        {
          administrator: {
            display_name: { contains: props.body.search, mode: "insensitive" },
          },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_admin_action_logsWhereInput;
  // Query with pagination - sequential await for findMany and count
  const data =
    await MyGlobal.prisma.discussion_board_admin_action_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminActionLogAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.discussion_board_admin_action_logs.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminActionLogAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
        Math.ceil(total / limit),
      ),
    } satisfies IPage.IPagination,
  };
}
