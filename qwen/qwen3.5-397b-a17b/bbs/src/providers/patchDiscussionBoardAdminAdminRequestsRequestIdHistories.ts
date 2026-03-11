import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminRequestHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminRequestsRequestIdHistories(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminRequestHistory.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequestHistory.ISummary> {
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      member_id: props.admin.id,
      grade: "super",
      deleted_at: null,
    } satisfies Prisma.discussion_board_adminsWhereInput,
  });
  if (!adminRecord) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
    where: { id: props.requestId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderBy = (props.body.sort === "desc" ? "desc" : "asc") satisfies
    | "asc"
    | "desc";
  const data =
    await MyGlobal.prisma.discussion_board_admin_request_histories.findMany({
      where: {
        discussion_board_admin_request_id: props.requestId,
      } satisfies Prisma.discussion_board_admin_request_historiesWhereInput,
      skip,
      take: limit,
      orderBy: { created_at: orderBy },
      ...DiscussionBoardAdminRequestHistoryAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_admin_request_histories.count({
      where: {
        discussion_board_admin_request_id: props.requestId,
      } satisfies Prisma.discussion_board_admin_request_historiesWhereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminRequestHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
