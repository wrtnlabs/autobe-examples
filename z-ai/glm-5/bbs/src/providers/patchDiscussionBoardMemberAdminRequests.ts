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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberAdminRequests(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "-created_at";
  const orderBy = sort.startsWith("-")
    ? { created_at: "desc" as const }
    : { created_at: "asc" as const };
  const dateFilter =
    props.body.created_at_from != null || props.body.created_at_to != null
      ? {
          ...(props.body.created_at_from != null && {
            gte: props.body.created_at_from,
          }),
          ...(props.body.created_at_to != null && {
            lte: props.body.created_at_to,
          }),
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status != null && { status: props.body.status }),
    ...(props.body.member_id != null && { member_id: props.body.member_id }),
    ...(props.body.search != null && {
      member: {
        OR: [
          {
            display_name: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      },
    }),
    ...(dateFilter != null && { created_at: dateFilter }),
  } satisfies Prisma.discussion_board_admin_requestsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_admin_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
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
