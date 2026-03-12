import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestDecision";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdminRequestDecisionAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestDecisionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdminRequestsDecisions(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdminRequestDecision.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequestDecision.ISummary> {
  // Verify super administrator grade
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
      select: { grade: true },
    });
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause with optional filters
  const whereInput = {
    deleted_at: null,
    ...(props.body.decision_type && {
      decision_type: props.body.decision_type,
    }),
    ...(props.body.reviewer_id && {
      discussion_board_administrator_id: props.body.reviewer_id,
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.discussion_board_admin_request_decisionsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query decisions with JOINs using transformer select
  const decisions =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminRequestDecisionAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.count({
      where: whereInput,
    });
  // Transform results to DTO format
  const data = await ArrayUtil.asyncMap(
    decisions,
    DiscussionBoardAdminRequestDecisionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
