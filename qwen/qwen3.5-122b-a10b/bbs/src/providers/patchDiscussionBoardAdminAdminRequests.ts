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
  // Verify super administrator grade
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id },
      select: { grade: true },
    },
  );
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.discussion_board_admin_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submitted_at_from && {
      submitted_at: {
        gte: new Date(props.body.submitted_at_from),
      },
    }),
    ...(props.body.submitted_at_to && {
      submitted_at: {
        lte: new Date(props.body.submitted_at_to),
      },
    }),
    ...(props.body.reviewed_at_from && {
      reviewed_at: {
        gte: new Date(props.body.reviewed_at_from),
      },
    }),
    ...(props.body.reviewed_at_to && {
      reviewed_at: {
        lte: new Date(props.body.reviewed_at_to),
      },
    }),
    ...(props.body.search && {
      OR: [
        { member: { email: { contains: props.body.search } } },
        { member: { display_name: { contains: props.body.search } } },
        { reason: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.discussion_board_admin_requestsWhereInput;
  // Query data
  const data = await MyGlobal.prisma.discussion_board_admin_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { submitted_at: "desc" },
    ...DiscussionBoardAdminRequestAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.discussion_board_admin_requests.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await Promise.all(
    data.map((item) =>
      DiscussionBoardAdminRequestAtSummaryTransformer.transform(item),
    ),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageIDiscussionBoardAdminRequest.ISummary;
}
