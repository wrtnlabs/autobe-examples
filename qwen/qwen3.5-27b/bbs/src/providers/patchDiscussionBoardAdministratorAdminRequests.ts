import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdminRequests(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_admin_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.submittedAtFrom && {
      submitted_at: { gte: new Date(props.body.submittedAtFrom) },
    }),
    ...(props.body.submittedAtTo && {
      submitted_at: { lte: new Date(props.body.submittedAtTo) },
    }),
    ...(props.body.reviewedAtFrom && {
      reviewed_at: { gte: new Date(props.body.reviewedAtFrom) },
    }),
    ...(props.body.reviewedAtTo && {
      reviewed_at: { lte: new Date(props.body.reviewedAtTo) },
    }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { submitted_at: "desc" },
      ...DiscussionBoardAdminRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admin_requests.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminRequestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
