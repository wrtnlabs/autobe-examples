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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministrativeHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardAdministrativeHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministrativeHistories(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministrativeHistory.IRequest;
}): Promise<IPageIDiscussionBoardAdministrativeHistory.ISummary> {
  // Verify superAdmin exists (optional but good practice)
  await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
    where: { id: props.superAdmin.id, deleted_at: null },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput =
    {} as Prisma.discussion_board_administrative_historiesWhereInput;
  // Date range filtering
  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    whereInput.created_at = {} as Prisma.DateTimeFilter;
    if (props.body.start_date !== undefined && props.body.start_date !== null) {
      whereInput.created_at.gte = new Date(props.body.start_date);
    }
    if (props.body.end_date !== undefined && props.body.end_date !== null) {
      whereInput.created_at.lte = new Date(props.body.end_date);
    }
  }
  // Other filters
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.target_type !== undefined && props.body.target_type !== null) {
    whereInput.target_type = props.body.target_type;
  }
  if (
    props.body.administrator_id !== undefined &&
    props.body.administrator_id !== null
  ) {
    whereInput.administrator_id = props.body.administrator_id;
  }
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereInput.description = { contains: props.body.search };
  }
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_administrative_histories.count({
      where: whereInput,
    });
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_administrative_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" } as const,
      ...DiscussionBoardAdministrativeHistoryAtSummaryTransformer.select(),
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(data, (record) =>
    DiscussionBoardAdministrativeHistoryAtSummaryTransformer.transform(record),
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
