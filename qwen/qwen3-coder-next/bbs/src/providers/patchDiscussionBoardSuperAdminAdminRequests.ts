import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdminRequests(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where condition with status filter
  const whereInput = {
    status: "pending",
  } satisfies Prisma.discussion_board_administrator_requestsWhereInput;
  // Build order by condition
  const orderByInput =
    props.body.sortBy === "submitted_at" && props.body.sortOrder === "asc"
      ? [{ submitted_at: "asc" as const }, { id: "asc" as const }]
      : [{ submitted_at: "desc" as const }, { id: "asc" as const }];
  // Query data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where: whereInput,
      skip,
      take: limit + 1,
      orderBy: orderByInput,
      ...DiscussionBoardAdministratorRequestAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.discussion_board_administrator_requests.count({
      where: whereInput,
    });
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdministratorRequestAtSummaryTransformer.transform,
  );
  // Determine pagination info
  const hasMore = data.length > limit;
  const paginatedData = hasMore ? transformed.slice(0, limit) : transformed;
  const records = hasMore ? total : transformed.length;
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardAdministratorRequest.ISummary;
}
