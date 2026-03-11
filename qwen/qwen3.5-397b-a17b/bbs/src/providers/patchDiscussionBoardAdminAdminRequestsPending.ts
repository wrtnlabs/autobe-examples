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

export async function patchDiscussionBoardAdminAdminRequestsPending(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const submittedAtFilter: Prisma.DateTimeFilter | undefined = (() => {
    const from = props.body.submitted_from;
    const to = props.body.submitted_to;
    if (from !== undefined && to !== undefined) {
      return { gte: from, lte: to };
    } else if (from !== undefined) {
      return { gte: from };
    } else if (to !== undefined) {
      return { lte: to };
    }
    return undefined;
  })();
  const whereInput: Prisma.discussion_board_admin_requestsWhereInput = {
    status: "pending",
    ...(props.body.search !== undefined && {
      OR: [
        { reason: { contains: props.body.search } },
        { member: { display_name: { contains: props.body.search } } },
        { member: { email: { contains: props.body.search } } },
      ],
    }),
    ...(submittedAtFilter !== undefined && {
      submitted_at: submittedAtFilter,
    }),
  } satisfies Prisma.discussion_board_admin_requestsWhereInput;
  const orderByInput: Prisma.discussion_board_admin_requestsOrderByWithRelationInput =
    props.body.sort === "desc"
      ? { submitted_at: "desc" }
      : { submitted_at: "asc" };
  const data = await MyGlobal.prisma.discussion_board_admin_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardAdminRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_admin_requests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
