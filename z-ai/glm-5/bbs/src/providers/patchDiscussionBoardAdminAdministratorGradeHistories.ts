import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorGradeHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorGradeHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdministratorGradeHistories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministratorGradeHistory.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorGradeHistory.ISummary> {
  // Verify super administrator is active (not banned, not deleted)
  const caller =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true, banned_at: true, deleted_at: true },
    });
  if (caller.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  if (caller.banned_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (caller.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with proper date range handling
  const createdAtFilter =
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
      ? {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        }
      : props.body.created_at_from !== undefined
        ? { gte: new Date(props.body.created_at_from) }
        : props.body.created_at_to !== undefined
          ? { lte: new Date(props.body.created_at_to) }
          : undefined;
  const whereInput = {
    ...(props.body.admin_id !== undefined && { admin_id: props.body.admin_id }),
    ...(props.body.acted_by !== undefined && { acted_by: props.body.acted_by }),
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.previous_grade !== undefined && {
      previous_grade: props.body.previous_grade,
    }),
    ...(props.body.new_grade !== undefined && {
      new_grade: props.body.new_grade,
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.discussion_board_administrator_grade_historiesWhereInput;
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query records
  const records =
    await MyGlobal.prisma.discussion_board_administrator_grade_histories.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...DiscussionBoardAdministratorGradeHistoryAtSummaryTransformer.select(),
      },
    );
  // Count total
  const total =
    await MyGlobal.prisma.discussion_board_administrator_grade_histories.count({
      where: whereInput,
    });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      records,
      DiscussionBoardAdministratorGradeHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
