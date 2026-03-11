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

export async function patchDiscussionBoardSuperAdminAdministratorAssignmentsHistory(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministrativeHistory.IRequest;
}): Promise<IPageIDiscussionBoardAdministrativeHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause based on filters
  const whereInput = {
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_type && { target_type: props.body.target_type }),
    ...(props.body.administrator_id && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.search && {
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...((props.body.start_date || props.body.end_date) && {
      created_at: {
        ...(props.body.start_date && { gte: new Date(props.body.start_date) }),
        ...(props.body.end_date && { lte: new Date(props.body.end_date) }),
      },
    }),
  } satisfies Prisma.discussion_board_administrative_historiesWhereInput;
  // Order by creation date descending (most recent first)
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.discussion_board_administrative_historiesOrderByWithRelationInput;
  // Execute paginated query
  const data =
    await MyGlobal.prisma.discussion_board_administrative_histories.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...DiscussionBoardAdministrativeHistoryAtSummaryTransformer.select(),
    });
  // Count total matching records
  const total =
    await MyGlobal.prisma.discussion_board_administrative_histories.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministrativeHistoryAtSummaryTransformer.transform,
  );
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
