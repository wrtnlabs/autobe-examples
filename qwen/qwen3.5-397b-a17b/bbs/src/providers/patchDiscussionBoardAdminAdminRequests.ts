import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_admin_requestsWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submitted_from && {
      submitted_at: { gte: new Date(props.body.submitted_from) },
    }),
    ...(props.body.submitted_to && {
      submitted_at: { lte: new Date(props.body.submitted_to) },
    }),
    ...(props.body.search && {
      OR: [
        { reason: { contains: props.body.search } },
        {
          member: {
            display_name: { contains: props.body.search },
          },
        },
        {
          member: {
            email: { contains: props.body.search },
          },
        },
      ],
    }),
  };
  const orderByInput: Prisma.discussion_board_admin_requestsOrderByWithRelationInput =
    {
      submitted_at: props.body.sort ?? "asc",
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAdminRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admin_requests.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminRequestAtSummaryTransformer.transform,
    ),
  };
}
