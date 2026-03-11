import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdminRequestDecisionAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestDecisionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdminRequestDecisions(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdminRequestDecision.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequestDecision.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.discussion_board_admin_request_decisionsWhereInput =
    {
      deleted_at: null,
      ...(props.body.decision !== undefined &&
        props.body.decision !== null && { decision: props.body.decision }),
      ...(props.body.super_admin_id !== undefined &&
        props.body.super_admin_id !== null && {
          super_admin_id: props.body.super_admin_id,
        }),
      ...(props.body.created_at_start !== undefined &&
        props.body.created_at_start !== null &&
        props.body.created_at_end !== undefined &&
        props.body.created_at_end !== null && {
          created_at: {
            gte: new Date(props.body.created_at_start),
            lte: new Date(props.body.created_at_end),
          },
        }),
      ...(props.body.search !== undefined &&
        props.body.search !== null && {
          OR: [
            { decision: { contains: props.body.search, mode: "insensitive" } },
            {
              adminRequest: {
                reason: { contains: props.body.search, mode: "insensitive" },
              },
            },
            {
              adminRequest: {
                member: {
                  display_name: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              adminRequest: {
                member: {
                  email: { contains: props.body.search, mode: "insensitive" },
                },
              },
            },
            {
              superAdmin: {
                email: { contains: props.body.search, mode: "insensitive" },
              },
            },
          ],
        }),
    };
  // Get data with pagination
  const data =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardAdminRequestDecisionAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_admin_request_decisions.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminRequestDecisionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
