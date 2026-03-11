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

export async function patchDiscussionBoardSuperAdminAdminRequestsHistory(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdminRequestDecision.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequestDecision.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where conditions based on filters
  const whereInput: Prisma.discussion_board_admin_request_decisionsWhereInput =
    {
      deleted_at: null,
      ...(props.body.decision && { decision: props.body.decision }),
      ...(props.body.super_admin_id && {
        super_admin_id: props.body.super_admin_id,
      }),
      ...(props.body.created_at_start &&
        props.body.created_at_end && {
          created_at: {
            gte: new Date(props.body.created_at_start),
            lte: new Date(props.body.created_at_end),
          },
        }),
      ...(props.body.created_at_start &&
        !props.body.created_at_end && {
          created_at: {
            gte: new Date(props.body.created_at_start),
          },
        }),
      ...(!props.body.created_at_start &&
        props.body.created_at_end && {
          created_at: {
            lte: new Date(props.body.created_at_end),
          },
        }),
      ...(props.body.search && {
        OR: [
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
        ],
      }),
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_request_decisions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminRequestDecisionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admin_request_decisions.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminRequestDecisionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
