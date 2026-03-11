import { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministrativeHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardAdministrativeHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdministrativeHistories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministrativeHistory.IRequest;
}): Promise<IPageIDiscussionBoardAdministrativeHistory.ISummary> {
  // Get admin record to determine admin_grade
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id, deleted_at: null },
      select: { id: true, admin_grade: true },
    });
  // Build where clause
  const whereInput: Prisma.discussion_board_administrative_historiesWhereInput =
    {
      // Regular admins can only see their own actions
      ...(adminRecord.admin_grade !== "super" && {
        administrator_id: props.admin.id,
      }),
      ...(props.body.action_type !== undefined &&
        props.body.action_type !== null && {
          action_type: props.body.action_type,
        }),
      ...(props.body.target_type !== undefined &&
        props.body.target_type !== null && {
          target_type: props.body.target_type,
        }),
      ...(props.body.administrator_id !== undefined &&
        props.body.administrator_id !== null && {
          administrator_id: props.body.administrator_id,
        }),
      ...(props.body.start_date !== undefined &&
        props.body.start_date !== null && {
          created_at: { gte: new Date(props.body.start_date) },
        }),
      ...(props.body.end_date !== undefined &&
        props.body.end_date !== null && {
          created_at: { lte: new Date(props.body.end_date) },
        }),
      ...(props.body.search !== undefined &&
        props.body.search !== null && {
          description: { contains: props.body.search },
        }),
    };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_administrative_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdministrativeHistoryAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_administrative_histories.count({
      where: whereInput,
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministrativeHistoryAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
